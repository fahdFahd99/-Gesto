import type {SqlDatabase,SqlStatement} from './sql';
/** Initialize non-business metadata only. Never auto-create sample products, suppliers, sales or stock. */
export async function initialize(db:SqlDatabase){
 const defaults={initialized:'1',pharmacyName:'Pharmacie Ijjai',pharmacist:'',address:'',phone:'',expiryDays:'90'};
 await db.batch([
   ...Object.entries(defaults).map(([key,value])=>db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').bind(key,value)),
   db.prepare("INSERT OR IGNORE INTO taxes (id,label,rateBp) VALUES ('exonere','Exonéré',0)"),
 ]);
}
