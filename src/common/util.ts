import {CondStmtEntity, ExprStmtEntity, KEY, RawStmtEntity, SelectStmtEntity, StmtBuilder} from "../model/stmt-model";

export function isNumber(v:any):v is number{
    return typeof v==="number";
}

export function isString(v:any):v is string{
    return typeof v==="string";
}

export function isFunction(v:any):v is Function{
    return typeof v==="function";
}

export function isArray(v:any):v is Array<any>{
    return v!=undefined&&Array.isArray(v);
}

export function isObject(v:any):v is object{
    return v!=undefined&&!Array.isArray(v)&&typeof v==='object';
}

export function isEmpty(v:any):boolean {
    if(!v||v.length==0)return true;

    let empty=true;
    for(let p in v){
        empty=false;
        break;
    }

    return empty;
}

export function isStmtBuilder(v:any):v is StmtBuilder<any> {
    return v!=undefined&&isFunction(v.toStmt);
}

export function isStmtEntity(v:any,$type:KEY):boolean{
    return v!=undefined&&v.$type==$type;
}

export function isRawStmtEntity(v:any):v is RawStmtEntity{
    return isStmtEntity(v,KEY.RAW);
}

export function isCondStmtEntity(v:any):v is CondStmtEntity{
    return isStmtEntity(v,KEY.COND);
}

export function isExprStmtEntity(v:any):v is ExprStmtEntity{
    return isStmtEntity(v,KEY.EXPR);
}

export function isSelectStmtEntity(v:any):v is SelectStmtEntity{
    return isStmtEntity(v,KEY.SELECT);
}

export function toStmts(items:Array<any>){
    return items.
        filter(item=>item!=undefined).
        map(item=>{
            return isStmtBuilder(item)?item.toStmt():item;
        });
}

export function mixin(clazz:Function,...baseClazz:Array<Function>){
    baseClazz.forEach(base=>{
        Object.getOwnPropertyNames(base.prototype).forEach(name=>{
            clazz.prototype[name]=base.prototype[name];
        });
    });
}

export function splitAndFlatStringArray(values:string|Array<string>,sep?:string){
    let rs:Array<string>=[];
    if(isEmpty(values))return rs;

    sep=sep==undefined?',':sep;
    values=isString(values)?[values]:values;

    for(let v of values){
        let splits=v.includes(sep)?v.split(sep):[v];
        rs.push(...splits);
    }

    return rs;
}

export function pick(o:object,keys:string|Array<string>){
    keys=isString(keys)?[keys]:keys;

    let rs:any={};
    let len=keys.length;
    if(isEmpty(o)||len==0)return rs;

    let i=-1;
    while(++i<len){
        let key=keys[i];
        if(o.hasOwnProperty(key))
            rs[key]=(<any>o)[key];
    }

    return rs;
}

export function pickBatch(objs?:Array<object|undefined>,keys?:string|Array<string>){
    let rs:Array<object>=[];
    if(objs==undefined||objs.length==0||
        keys==undefined||keys.length==0)return rs;

    return objs.reduce<Array<object>>((acc,o)=>{
        o=o==undefined?o:pick(o,keys);
        if(!isEmpty(o))acc.push(o!);

        return acc;
    },rs);
}

export function propValueArray(
    objs:any,propName:string,
    map?:(v:any)=>any,keepNullValue?:boolean){

    let rs:Array<any>=[];
    if(objs==undefined)return rs;

    let os=isArray(objs)?objs:[objs];
    for(let o of os){
        let v=isObject(o)?(<any>o)[propName]:o;

        v=map==undefined?v:map(v);
        if(v!=undefined||keepNullValue)rs.push(v);
    }

    return rs;
}

export function idArray(objs:any,
                        idPropName:string,map?:(v:any)=>any){
    map=map!=undefined?map:
        v=>v===undefined?v:v.toString();

    return propValueArray(objs,idPropName,map,false);
}