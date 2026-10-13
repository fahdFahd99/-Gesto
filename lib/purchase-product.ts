/** Shared, dependency-free rules for creating a catalogue item from Achats. */
import type {ProductInput} from './domain';

export function barcodeHintFromSearch(query:string):string {
 const code=query.trim();
 return /^[A-Za-z0-9._-]{3,48}$/.test(code) && /\d/.test(code) ? code : '';
}

/** A barcode scan is a digit-only code of sufficient length. Never silently select a fuzzy suggestion. */
export function isLikelyBarcodeScan(query:string):boolean {
 return /^\d{8,48}$/.test(query.trim());
}

export function firstPurchaseLineForProduct(id:string, product:Pick<ProductInput,'purchaseCents'|'discountBp'|'saleCents'>, key:string){
 if(!id.trim()||!key.trim())throw new Error('Identifiants du produit et de ligne requis.');
 return {key,productId:id,series:1,manufacturerLot:'',expiry:null as string|null,
  quantity:1,freeQuantity:0,purchaseCents:product.purchaseCents,
  discountBp:product.discountBp,saleCents:product.saleCents};
}
