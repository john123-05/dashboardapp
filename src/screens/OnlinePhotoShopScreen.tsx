import {useState} from 'react';
import {Linking,Text} from 'react-native';
import {Screen} from '../components/Screen';
import {Button,Card,ErrorNote,Section} from '../components/ui';
import {getFunctionSession} from '../lib/functionAuth';
import {EXTERNAL_SUPABASE_URL,EXTERNAL_SUPABASE_ANON_KEY} from '../lib/supabase';
import {useData} from '../lib/useData';
import {localeTag,tr} from '../i18n';
import {colors,font} from '../theme';
type Settings={unlock_mode:'purchase'|'email';price_cents:number;currency:string;shop_url:string;screen_url:string};
async function request(parkId:string,mode?:string):Promise<Settings>{
 const {data:{session}}=await getFunctionSession();if(!session)throw new Error(tr('Nicht angemeldet'));
 const r=await fetch(EXTERNAL_SUPABASE_URL+'/functions/v1/operator-online-photo-settings',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,apikey:EXTERNAL_SUPABASE_ANON_KEY},body:JSON.stringify({park_id:parkId,...(mode?{unlock_mode:mode}:{})})});const result=await r.json();if(!r.ok||!result.data)throw new Error(tr('Einstellungen konnten nicht gespeichert werden. Parkinhaber-Zugang erforderlich.'));return result.data;
}
export function OnlinePhotoShopScreen({parkId}:{parkId:string}){
 const settings=useData('online-shop:'+parkId,()=>request(parkId),[parkId],30000),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(mode:string){setBusy(true);setError('');try{await request(parkId,mode);settings.reload();}catch(e){setError(e instanceof Error?e.message:tr('Fehler'));}finally{setBusy(false);}}
 const data=settings.data;
 return <Screen page="shop" tabs actions title={tr('Foto-Webshop')} subtitle={tr('Testmodus')} refreshing={settings.refreshing} onRefresh={settings.reload}>{(error||settings.error)&&<ErrorNote text={error||settings.error!} onRetry={settings.reload}/>}{data&&<><Section title={tr('Foto freischalten mit')}><Card><Text style={{...font.footnote,color:colors.ink2}}>{tr('Gilt sofort für neue Freischaltungen. Bereits freigeschaltete Fotos bleiben verfügbar.')}</Text><Button title={(data.unlock_mode==='purchase'?'✓ ':'')+tr('Stripe-Zahlung')} loading={busy} onPress={()=>{if(!busy&&data.unlock_mode!=='purchase')void save('purchase');}}/><Text>{new Intl.NumberFormat(localeTag(),{style:'currency',currency:data.currency}).format(data.price_cents/100)} · {tr('Testmodus')}</Text><Button title={(data.unlock_mode==='email'?'✓ ':'')+tr('Kostenlos gegen E-Mail')} loading={busy} onPress={()=>{if(!busy&&data.unlock_mode!=='email')void save('email');}}/><Text style={{...font.footnote,color:colors.ink2}}>{tr('Newsletter-Einwilligung bleibt freiwillig.')}</Text></Card></Section><Section title={tr('Fotos')}><Card><Button title={tr('Webshop öffnen')} onPress={()=>void Linking.openURL(data.shop_url)}/><Button title={tr('Bildschirmgalerie öffnen')} onPress={()=>void Linking.openURL(data.screen_url)}/></Card></Section></>}</Screen>;
}
