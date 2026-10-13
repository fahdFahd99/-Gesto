export const RIGHTS={sales:'Ventes',purchases:'Achats',stock:'Stock & catalogue',reports:'Rapports',margins:'Coûts & marges',returns:'Retours & avoirs',suppliers:'Fournisseurs',settings:'Réglages',backups:'Sauvegardes',employees:'Employés'} as const;
export type Right=keyof typeof RIGHTS;
export interface Actor {id:string;name:string;username:string;email?:string;role:'owner'|'employee';rights:Partial<Record<Right,boolean>>;enabled:number;version:number}
export const can=(actor:Actor|null|undefined,right:Right)=>!!actor&&(actor.role==='owner'||actor.rights[right]===true);
