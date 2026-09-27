import {NextResponse} from 'next/server';
import {userFromRequest} from '../../../lib/server';

export const runtime='nodejs';

export async function DELETE(req:Request){

  const user=userFromRequest(req);

  if(!user || user.role!=='customer'){
    return NextResponse.json(
      {error:'Forbidden'},
      {status:403}
    );
  }

  return NextResponse.json(
    {
      error:'Orders cannot be cancelled by sellers.'
    },
    {
      status:403
    }
  );
}