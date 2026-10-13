/** Planned import contract. This module intentionally performs no Firebase calls. */
export type ExternalCatalogRecord={
 source:'lfarmacien';
 sourceId:string;
 kind:'medicament'|'parapharmacie';
 name:string;
 barcode?:string|null;
 brand?:string|null;
 category?:string|null;
 dci?:string|null;
 purchasePriceCents?:number|null;
 salePriceCents?:number|null;
 imageUrl?:string|null;
};
export type CatalogImportReport={read:number;accepted:number;skipped:number;conflicts:number;errors:string[]};
/** No import is triggered automatically: pharmacy stock and prices must be validated separately. */
export function validateCatalogRecord(record:ExternalCatalogRecord):string[]{
 const errors:string[]=[];
 if(!['medicament','parapharmacie'].includes(record.kind))errors.push('famille invalide');
 if(!record.sourceId?.trim())errors.push('sourceId requis');
 if(!record.name?.trim())errors.push('nom requis');
 if(record.barcode && !/^[A-Za-z0-9._-]{3,48}$/.test(record.barcode.trim()))errors.push('code-barres invalide');
 for(const price of [record.purchasePriceCents,record.salePriceCents])if(price!=null&&(!Number.isInteger(price)||price<0))errors.push('prix invalide');
 return errors;
}
