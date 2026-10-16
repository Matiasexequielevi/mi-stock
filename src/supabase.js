import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured=Boolean(url&&key);
export const supabase=configured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
export function cleanPhone(value){return String(value||'').replace(/\D/g,'')}
export function phoneEmail(value){const p=cleanPhone(value);if(p.length<8||p.length>15)throw Error('Ingresá un celular válido (8 a 15 dígitos).');return `${p}@mistock.example.com`}
export function friendlyError(e){return e?.message||'Ocurrió un error inesperado.'}
