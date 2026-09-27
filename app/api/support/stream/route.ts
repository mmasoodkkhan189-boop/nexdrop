import {NextResponse} from "next/server";
import {readDB,userFromToken} from "../../../lib/server";
import {markAgentSeen,supportSnapshot} from "../../../lib/support";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:Request){
  const token=new URL(req.url).searchParams.get("token");
  const user=userFromToken(token);
  if(!user)return NextResponse.json({error:"Not authenticated"},{status:401});

  const encoder=new TextEncoder();
  let closed=false;
  let timer:any;
  let last="";

  const stream=new ReadableStream({
    start(controller){
      const send=()=>{
        if(closed)return;
        try{
          // An agent with the inbox open counts as "support online".
          if(user.role==="admin")markAgentSeen(user.id);
          const payload=JSON.stringify(supportSnapshot(readDB(),user));
          // Only push when something changed (messages, status, typing, presence).
          if(payload!==last){
            last=payload;
            controller.enqueue(encoder.encode(`event: support\ndata: ${payload}\n\n`));
          }
        }catch{
          closed=true;
          clearInterval(timer);
        }
      };
      send();
      timer=setInterval(send,700);
      req.signal.addEventListener("abort",()=>{
        closed=true;
        clearInterval(timer);
        try{controller.close()}catch{}
      });
    },
    cancel(){
      closed=true;
      clearInterval(timer);
    }
  });

  return new Response(stream,{headers:{
    "Content-Type":"text/event-stream; charset=utf-8",
    "Cache-Control":"no-cache, no-transform",
    "Connection":"keep-alive",
    "X-Accel-Buffering":"no"
  }});
}
