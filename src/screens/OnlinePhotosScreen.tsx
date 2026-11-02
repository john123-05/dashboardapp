import {useState} from 'react';
import {Linking,Text,TextInput,View} from 'react-native';
import {Image} from 'expo-image';
import {Screen} from '../components/Screen';
import {Button,Card,ErrorNote,Section} from '../components/ui';
import {tr} from '../i18n';
import {colors,font} from '../theme';
import {useData} from '../lib/useData';
type Photo={code:string;number:string|null;captured_at:string;preview_url:string;claim_url:string};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
async function search(date:string,number:string,time:string):Promise<Photo[]>{const r=await fetch('https://kvpcwlcfgmsmarjtwpsx.supabase.co/functions/v1/online-photo-sales/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:'kalahari-virginia',date,number,time})});const data=await r.json();if(!r.ok)throw new Error(data.error);return data.photos;}
export function OnlinePhotosScreen(){
 const [date,setDate]=useState(today),[number,setNumber]=useState(''),[time,setTime]=useState(''),[query,setQuery]=useState({date:today(),number:'',time:''});
 const photos=useData('online-photos:'+JSON.stringify(query),()=>search(query.date,query.number,query.time),[query],30000);
 const input={borderWidth:1,borderColor:colors.ink3,borderRadius:8,padding:12,color:colors.ink};
 return <Screen page="photos" tabs actions title={tr('Fotos')} subtitle="Kalahari Virginia" refreshing={photos.refreshing} onRefresh={photos.reload}><Card><Text>{tr('Datum')} (YYYY-MM-DD)</Text><TextInput style={input} value={date} onChangeText={setDate}/><Text>{tr('Bildnummer')}</Text><TextInput style={input} value={number} onChangeText={setNumber} keyboardType="number-pad" maxLength={5}/><Text>{tr('Uhrzeit')} (HH:MM · Virginia)</Text><TextInput style={input} value={time} onChangeText={setTime} placeholder="13:00"/><Button title={tr('Suchen')} onPress={()=>setQuery({date,number:number.trim(),time:time.trim()})}/></Card>{photos.error&&<ErrorNote text={photos.error} onRetry={photos.reload}/>}<Section title={tr('Vorschau')}><View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{photos.data?.map(p=><Card key={p.code} style={{width:'47%',padding:8}}><Image source={{uri:p.preview_url}} style={{width:'100%',aspectRatio:4/3}} contentFit="contain"/><Text style={font.footnote}>{p.number} · {new Date(p.captured_at).toLocaleTimeString(undefined,{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit'})}</Text></Card>)}</View></Section><Button title={tr('Webshop öffnen')} onPress={()=>void Linking.openURL('https://liftpictures-fotos.de/kalahari-virginia/shop')}/></Screen>;
}
