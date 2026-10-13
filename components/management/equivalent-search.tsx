'use client';
import {useMemo,useState} from 'react';
import {Search,Plus,Trash2} from 'lucide-react';
import {type ActiveIngredient,EMPTY_INGREDIENT,ingredientUnits,ingredientsOf,sameComposition,validComposition,formatComposition,normalizeDci} from '@/lib/ingredients';
import {productLabel,moneyFmt,type Product} from '@/lib/domain';
import {Button,Field,Select,Modal} from './common';

/** Shared input for the product editor and the on-demand composition search. */
export function IngredientsEditor({value,onChange,suggestions=[]}:{value:ActiveIngredient[];onChange:(v:ActiveIngredient[])=>void;suggestions?:string[]}){
 const rows=value.length?value:[{...EMPTY_INGREDIENT}];
 const edit=(index:number,update:Partial<ActiveIngredient>)=>onChange(rows.map((a,i)=>i===index?{...a,...update}:a));
 return <div className="ingredient-editor">
   <p className="note">1 à 4 matières actives. Chaque DCI doit avoir son propre dosage et son unité.</p>
   {rows.map((a,i)=><div className="ingredient-line" key={i}>
     <Field label={`DCI ${i+1} *`}><input list="known-active-substances" placeholder="Ex. Paracétamol" value={a.name} onChange={e=>edit(i,{name:e.target.value})} required/></Field>
     <Field label="Dosage *"><input type="number" min="0.000001" max="1000000" step="any" inputMode="decimal" value={a.dose||''} placeholder="500" required onChange={e=>edit(i,{dose:Number(e.target.value)})}/></Field>
     <Field label="Unité *"><Select value={a.unit} onChange={e=>edit(i,{unit:e.target.value as ActiveIngredient['unit']})}>{ingredientUnits.map(unit=><option key={unit} value={unit}>{unit}</option>)}</Select></Field>
     <button type="button" className="icon-btn" title="Supprimer la matière active" aria-label={`Supprimer DCI ${i+1}`} disabled={rows.length===1} onClick={()=>onChange(rows.filter((_,j)=>j!==i))}><Trash2 size={17}/></button>
   </div>)}
   {!!suggestions.length&&<datalist id="known-active-substances">{suggestions.map(s=><option key={s} value={s}/>)}</datalist>}
   {rows.length<4&&<Button secondary type="button" onClick={()=>onChange([...rows,{...EMPTY_INGREDIENT}])}><Plus size={16}/> Ajouter une matière active ({rows.length}/4)</Button>}
   {value.length>0&&validComposition(value)?<p className="ingredient-summary"><strong>Composition :</strong> {formatComposition(value)}</p>:<p className="note">Remplissez toutes les DCI et doses. Aucune substance supplémentaire ne sera acceptée dans la comparaison.</p>}
 </div>;
}

export function EquivalentSearch({products,source,onClose,onAdd,allowOutOfStock=false}:{products:Product[];source?:Product|null;onClose:()=>void;onAdd?:(p:Product)=>void;allowOutOfStock?:boolean}){
 const initial=source?ingredientsOf(source):[];
 const [ingredients,setIngredients]=useState<ActiveIngredient[]>(initial.length?initial:[{...EMPTY_INGREDIENT}]);
 const [sameForm,setSameForm]=useState(!!source?.form);
 const [form,setForm]=useState(source?.form||'');
 const choices=useMemo(()=>[...new Set(products.filter(p=>p.kind==='medicament').flatMap(p=>ingredientsOf(p).map(i=>i.name)))].sort(),[products]);
 const valid=validComposition(ingredients);
 const matches=useMemo(()=>valid?products.filter(p=>p.kind==='medicament'&&!p.archived&&p.id!==source?.id&&sameComposition(ingredients,ingredientsOf(p))&&(!sameForm||!form.trim()||normalizeDci(p.form)===normalizeDci(form))).sort((a,b)=>b.available-a.available||a.name.localeCompare(b.name,'fr')):[],[valid,products,source,ingredients,sameForm,form]);
 return <Modal title="Chercher équivalent — même composition" description={source?`Référence : ${source.name}`:'Médicament non trouvé ? Entrez sa composition exacte pour rechercher dans le catalogue.'} onClose={onClose} large>
  <div className="equivalent-content">
    <IngredientsEditor value={ingredients} onChange={setIngredients} suggestions={choices}/>
    <label className="equivalent-check"><input type="checkbox" checked={sameForm} onChange={e=>setSameForm(e.target.checked)}/> Exiger aussi la même forme pharmaceutique</label>
    {sameForm&&<Field label="Forme du médicament recherché"><input value={form} placeholder="Ex. Comprimé" onChange={e=>setForm(e.target.value)} /></Field>}
    {!valid?<p className="inline-error">Indiquez entre 1 et 4 DCI différentes, toutes avec un dosage positif et une unité.</p>:<>
       <div className="equivalent-result-count"><Search size={18}/> {matches.length} produit(s) avec exactement {ingredients.length} matière(s) active(s) et les mêmes dosages.</div>
       <div className="equivalent-result-list">{matches.map(p=><article className="equivalent-result" key={p.id}>
        <div><b>{productLabel(p)}</b><small>{p.barcode} · {p.form||'Forme non renseignée'} · {p.available} boîte(s) disponible(s)</small></div>
        <div className="equivalent-result-action"><strong>{moneyFmt(p.saleCents)} DH</strong>{onAdd&&<Button type="button" disabled={!allowOutOfStock&&p.available<=0} onClick={()=>{onAdd(p);onClose();}}>Ajouter</Button>}</div>
       </article>)}{!matches.length&&<p className="note">Aucun produit du catalogue ne correspond à cette combinaison exacte de DCI et de dosages.</p>}</div>
    </>}
    <p className="equivalent-warning">Correspondance informatique de composition et de dosage uniquement. Vérifier aussi la voie d’administration, la forme, la libération, le sel, la réglementation et les données cliniques avant toute substitution. Aucun résultat n’est une autorisation automatique de remplacement.</p>
  </div>
 </Modal>;
}
