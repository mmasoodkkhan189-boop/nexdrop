import crypto from "node:crypto";

export function addSystemMessage(db:any, customerId:string, text:string){
  let conversation=db.conversations.find((c:any)=>c.customerId===customerId);
  if(!conversation){
    conversation={id:crypto.randomUUID(),customerId,status:"open",updatedAt:new Date().toISOString()};
    db.conversations.push(conversation);
  }
  const message={id:crypto.randomUUID(),conversationId:conversation.id,senderId:"system",text,createdAt:new Date().toISOString(),readBy:[]};
  db.messages.push(message);
  conversation.updatedAt=message.createdAt;
  conversation.status="open";
  return message;
}
