import {NextResponse} from 'next/server';
import crypto from 'node:crypto';
import {readDB,writeDB,userFromRequest,logActivity} from '../../lib/server';
import {
  SUPPORT_TOPICS,
  addSupportSystemMessage,
  clearTyping,
  getOrCreateConversation,
  serializeConversation,
  setTyping,
  supportSnapshot
} from '../../lib/support';

export const runtime='nodejs';

const MAX_TEXT = 4000;
const MAX_IMAGE_CHARS = 3_000_000; // ~2 MB image as a data URL

export async function GET(req:Request){
  const user=userFromRequest(req);
  if(!user)return NextResponse.json({error:'Not authenticated'},{status:401});
  const db=readDB();
  return NextResponse.json(supportSnapshot(db,user),{headers:{'Cache-Control':'no-store'}});
}

export async function POST(req:Request){
  const user=userFromRequest(req);
  if(!user)return NextResponse.json({error:'Not authenticated'},{status:401});
  const body=await req.json().catch(()=>({}));
  const isAgent=user.role==='admin';

  // Customers always act on their own conversation; agents name the customer.
  const targetCustomerId=isAgent?String(body.customerId||''):user.id;

  if(body.action==='startConversation'){
    if(isAgent)return NextResponse.json({error:'Only customers can start a conversation'},{status:403});
    const db=readDB();
    const c=getOrCreateConversation(db,user.id);
    writeDB(db);
    return NextResponse.json({conversation:serializeConversation(db,c,user)});
  }

  if(body.action==='typing'){
    // Ephemeral: no db write, so this can be called often.
    const db=readDB();
    const c=db.conversations.find((x:any)=>x.customerId===targetCustomerId);
    if(c)setTyping(c.id,isAgent?'agent':'customer');
    return NextResponse.json({ok:true});
  }

  if(body.action==='markRead'){
    const db=readDB();
    const c=db.conversations.find((x:any)=>x.customerId===targetCustomerId);
    if(c){
      for(const m of db.messages.filter((x:any)=>x.conversationId===c.id&&x.senderId!==user.id)){
        m.readBy=Array.isArray(m.readBy)?m.readBy:[];
        if(!m.readBy.includes(user.id))m.readBy.push(user.id);
      }
      writeDB(db);
    }
    return NextResponse.json({ok:true});
  }

  if(body.action==='setStatus'){
    if(!isAgent)return NextResponse.json({error:'Only support agents can change the status'},{status:403});
    const status=body.status==='resolved'?'resolved':'open';
    const db=readDB();
    const c=db.conversations.find((x:any)=>x.customerId===targetCustomerId);
    if(!c)return NextResponse.json({error:'Conversation not found'},{status:404});
    if((c.status==='resolved'?'resolved':'open')!==status){
      c.status=status;
      if(status==='resolved'){
        c.resolvedAt=new Date().toISOString();
        addSupportSystemMessage(db,c,`${user.name||'Support'} marked this conversation as resolved`);
      }else{
        c.resolvedAt=null;
        addSupportSystemMessage(db,c,`${user.name||'Support'} reopened this conversation`);
      }
      logActivity(db,user.id,'SUPPORT_STATUS',`Support conversation ${status}`);
      writeDB(db);
    }
    return NextResponse.json({conversation:serializeConversation(db,c,user)});
  }

  // Default action: send a message
  const text=String(body.text||'').trim().slice(0,MAX_TEXT);
  const imageUrl=typeof body.imageUrl==='string'&&body.imageUrl.startsWith('data:image/')?body.imageUrl:'';
  if(!text&&!imageUrl)return NextResponse.json({error:'Message or image is required'},{status:400});
  if(imageUrl.length>MAX_IMAGE_CHARS)return NextResponse.json({error:'Image is too large (max 2 MB)'},{status:413});

  const db=readDB();
  if(isAgent&&!db.users.some((u:any)=>u.id===targetCustomerId&&u.role==='customer')){
    return NextResponse.json({error:'Customer not found'},{status:404});
  }

  const c=getOrCreateConversation(db,targetCustomerId);

  // A customer writing into a resolved conversation reopens it.
  if(!isAgent&&c.status==='resolved'){
    c.status='open';
    c.resolvedAt=null;
    addSupportSystemMessage(db,c,'Conversation reopened');
  }

  if(!isAgent&&!c.topic&&SUPPORT_TOPICS.includes(body.topic)){
    c.topic=body.topic;
  }

  const message={
    id:crypto.randomUUID(),
    conversationId:c.id,
    senderId:user.id,
    senderRole:isAgent?'agent':'customer',
    text,
    imageUrl:imageUrl||undefined,
    createdAt:new Date().toISOString(),
    readBy:[user.id]
  };
  db.messages.push(message);
  c.updatedAt=message.createdAt;
  if(c.status!=='resolved')c.status='open';
  clearTyping(c.id,isAgent?'agent':'customer');
  logActivity(db,user.id,'SUPPORT_MESSAGE_SENT',`${user.role} sent a support message`);
  writeDB(db);

  return NextResponse.json({message,conversation:serializeConversation(db,c,user)});
}
