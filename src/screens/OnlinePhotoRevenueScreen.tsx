import {Text} from 'react-native';
import {Screen} from '../components/Screen';
import {Card,ErrorNote,Kpi,KpiGrid,KpiSkeleton,Section} from '../components/ui';
import {EXTERNAL_SUPABASE_URL,EXTERNAL_SUPABASE_ANON_KEY} from '../lib/supabase';
import {getFunctionSession} from '../lib/functionAuth';
import {useData} from '../lib/useData';
import {localeTag,tr} from '../i18n';
import {colors,font} from '../theme';
type Totals={net_cents:number;payments:number;refunded_cents:number};
type Report={currency:string;test_mode:boolean;real:Totals;test:Totals;as_of:string};
async function load(parkId:string):Promise<Report>{
 const {data:{session}}=await getFunctionSession();
 if(!session)throw new Error(tr('Nicht angemeldet'));
 const res=await fetch(`${EXTERNAL_SUPABASE_URL}/functions/v1/operator-online-photo-revenue`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:EXTERNAL_SUPABASE_ANON_KEY},body:JSON.stringify({park_id:parkId})});
 const json=await res.json();if(!res.ok||!json.data)throw new Error(tr('Onlinezahlungen vorübergehend nicht verfügbar'));
 return json.data;
}
export function OnlinePhotoRevenueScreen({parkId}:{parkId:string}){
 const report=useData('online-revenue:'+parkId,()=>load(parkId),[parkId],60000);
 const money=(value:number)=>new Intl.NumberFormat(localeTag(),{style:'currency',currency:report.data?.currency??'USD'}).format(value/100);
 return <Screen page="revenue" tabs actions title={tr('Stripe-Onlineverkauf')} subtitle={tr('Testmodus')} refreshing={report.refreshing} onRefresh={report.reload}>
  {report.error&&<ErrorNote text={report.error} onRetry={report.reload}/>}
  {report.data?<><KpiGrid><Kpi icon="cash-outline" label={tr('Echte Onlineumsätze')} value={money(report.data.real.net_cents)} sub={tr('{0} Zahlungen · Gesamt',report.data.real.payments)}/><Kpi icon="flask-outline" label={tr('Testumsatz (separat)')} value={money(report.data.test.net_cents)} sub={tr('{0} Zahlungen · Gesamt',report.data.test.payments)}/></KpiGrid><Section title={tr('Datenstand: {0}',new Date(report.data.as_of).toLocaleString(localeTag()))}><Card><Text style={{...font.footnote,color:colors.ink2}}>{tr('Testzahlungen zählen nicht zum echten Umsatz. Foto-Uploads sind keine Verkäufe.')}</Text></Card></Section></>:!report.error&&<KpiSkeleton/>}
 </Screen>;
}
