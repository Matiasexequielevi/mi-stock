import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const digits=(v:unknown)=>String(v??'').replace(/\D/g,'');
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)return json({error:'Sin sesión'},401);
  const caller=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}}});
  const {data:{user},error:authErr}=await caller.auth.getUser(token);if(authErr||!user)return json({error:'Sesión inválida'},401);
  const admin=createClient(url,service);
  const {data:me,error:meErr}=await admin.from('profiles').select('role,active').eq('id',user.id).single();
  if(meErr||me?.role!=='admin'||!me.active)return json({error:'Acceso denegado'},403);
  const body=await req.json();const action=String(body.action||'');
  if(action==='list'){
   const {data,error}=await admin.from('profiles').select('id,phone,display_name,business_name,role,active,created_at').order('created_at',{ascending:false});
   if(error)throw error;return json({users:data});
  }
  if(action==='create'){
   const phone=digits(body.phone),password=String(body.password||''),name=String(body.name||'').trim();
   if(phone.length<8||phone.length>15||password.length<8||name.length<2||name.length>70)return json({error:'Ingresá nombre, celular válido y contraseña de al menos 8 caracteres.'},400);
   const {data:created,error:createError}=await admin.auth.admin.createUser({email:`${phone}@mistock.example.com`,password,email_confirm:true,user_metadata:{phone}});
   if(createError)return json({error:createError.message},400);
   const {error:profileError}=await admin.from('profiles').insert({id:created.user.id,phone,display_name:name,business_name:name,role:'user',active:true});
   if(profileError){await admin.auth.admin.deleteUser(created.user.id);throw profileError}return json({ok:true});
  }
  if(action==='toggle'){
   const id=String(body.id||'');if(id===user.id)return json({error:'No podés desactivar tu cuenta'},400);
   const {data:target}=await admin.from('profiles').select('role,active').eq('id',id).single();if(!target||target.role!=='user')return json({error:'Usuario inválido'},400);
   const {error}=await admin.from('profiles').update({active:!target.active}).eq('id',id);if(error)throw error;return json({ok:true});
  }
  if(action==='password'){
   const id=String(body.id||''),password=String(body.password||'');if(password.length<8)return json({error:'La contraseña debe tener al menos 8 caracteres'},400);
   const {data:target}=await admin.from('profiles').select('role').eq('id',id).single();if(!target||target.role!=='user')return json({error:'Usuario inválido'},400);
   const {error}=await admin.auth.admin.updateUserById(id,{password});if(error)throw error;return json({ok:true});
  }
  return json({error:'Acción desconocida'},400);
 }catch(e){return json({error:e instanceof Error?e.message:'Error interno'},500)}
});
