import {test} from 'node:test';
import assert from 'node:assert/strict';
import {barcodeHintFromSearch,isLikelyBarcodeScan,firstPurchaseLineForProduct} from '../lib/purchase-product.ts';

test('recognises typed/scanned barcodes without mistaking free text for a code',()=>{
 assert.equal(barcodeHintFromSearch(' 6110012345678 '),'6110012345678');
 assert.equal(barcodeHintFromSearch(' PARA 500 '),'');
 assert.equal(barcodeHintFromSearch('ABC-61100001'),'ABC-61100001');
 assert.equal(barcodeHintFromSearch('x'.repeat(49)),'');
 assert.equal(isLikelyBarcodeScan('6110012345678'),true);
 assert.equal(isLikelyBarcodeScan('500'),false);
 assert.equal(isLikelyBarcodeScan('PARA500'),false);
});

test('catalogue creation creates first unapproved purchase line, not stock',()=>{
 const product={purchaseCents:1250,discountBp:500,saleCents:2000};
 const line=firstPurchaseLineForProduct('product-123',product,'draft-line-1');
 assert.deepEqual(line,{key:'draft-line-1',productId:'product-123',series:1,manufacturerLot:'',expiry:null,quantity:1,freeQuantity:0,purchaseCents:1250,discountBp:500,saleCents:2000});
 assert.deepEqual(product,{purchaseCents:1250,discountBp:500,saleCents:2000});
 assert.throws(()=>firstPurchaseLineForProduct('',product,'draft-line-1'));
});
