import {dateOf,kinds,type Kind,type LedgerEntry} from './domain';
export function categorySummary(ledger:LedgerEntry[],from:string,to:string){
 const rows=Object.keys(kinds).map(kind=>({kind:kind as Kind,label:kinds[kind as Kind],grossCents:0,refundCents:0,netCents:0,taxCents:0,costCents:0,purchaseCents:0,quantity:0}));
 for(const e of ledger){const day=dateOf(e.createdAt);if(day<from||day>to)continue;const row=rows.find(r=>r.kind===e.kind);if(!row)continue;
  if(e.event==='purchase'){row.purchaseCents+=e.totalCents;continue;}
  if(e.event==='sale')row.grossCents+=e.totalCents;else row.refundCents-=e.totalCents;
  row.netCents+=e.totalCents;row.taxCents+=e.taxCents;row.costCents+=e.costCents||0;row.quantity+=e.quantity;
 }
 return rows.map(r=>({...r,netHtCents:r.netCents-r.taxCents,marginCents:r.netCents-r.costCents,marginPercent:r.netCents?100*(r.netCents-r.costCents)/r.netCents:null}));
}
