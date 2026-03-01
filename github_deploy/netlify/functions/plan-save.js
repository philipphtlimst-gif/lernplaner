// netlify/functions/plan-save.js
exports.handler = async function(event) {
  if(event.httpMethod==='OPTIONS') return {statusCode:204,headers:cors()};
  if(event.httpMethod!=='POST') return {statusCode:405,headers:cors(),body:'Method Not Allowed'};

  try{
    var body=JSON.parse(event.body||'{}');
    var ics=body.ics, token=body.token;
    if(!ics||ics.indexOf('BEGIN:VCALENDAR')<0)
      return {statusCode:400,headers:json(),body:JSON.stringify({error:'Invalid ICS'})};

    var key='plan_'+String(token||'default').replace(/[^a-z0-9]/gi,'_').slice(0,32);

    // Methode 1: NETLIFY_BLOBS_CONTEXT (auto-inject, manchmal nicht verfuegbar bei ZIP-Deploy)
    var ctx=process.env.NETLIFY_BLOBS_CONTEXT;
    if(ctx){
      try{
        var c=JSON.parse(Buffer.from(ctx,'base64').toString('utf-8'));
        var r=await fetch(c.url+'/lernplan/'+key,{
          method:'PUT',
          headers:{'Authorization':'Bearer '+c.token,'Content-Type':'text/calendar; charset=utf-8'},
          body:ics
        });
        if(r.ok) return {statusCode:200,headers:json(),body:JSON.stringify({ok:true,method:'blobs',key:key})};
        console.warn('Blobs PUT failed:',r.status, await r.text());
      }catch(e){console.warn('Blobs ctx error:',e.message);}
    }

    // Methode 2: Netlify Blobs via Site-ID + API-Token aus Env-Variablen
    // Einmalig in Netlify setzen: Site Settings > Environment Variables
    //   NETLIFY_SITE_ID = deine Site-ID (aus Site Settings > General)
    //   NETLIFY_API_TOKEN = dein Personal Access Token (User Settings > Applications)
    var siteId=process.env.NETLIFY_SITE_ID||process.env.SITE_ID;
    var apiToken=process.env.NETLIFY_API_TOKEN;
    if(siteId && apiToken){
      try{
        var blobUrl='https://api.netlify.com/api/v1/blobs/'+siteId+'/lernplan/'+key;
        var r2=await fetch(blobUrl,{
          method:'PUT',
          headers:{
            'Authorization':'Bearer '+apiToken,
            'Content-Type':'text/calendar; charset=utf-8'
          },
          body:ics
        });
        if(r2.ok) return {statusCode:200,headers:json(),body:JSON.stringify({ok:true,method:'blobs-api',key:key})};
        console.warn('Blobs API failed:',r2.status, await r2.text());
      }catch(e){console.warn('Blobs API error:',e.message);}
    }

    // Methode 3: Memory (Fallback - verliert Daten bei Function-Neustart)
    global._c=global._c||{};
    global._c[key]=ics;
    var hint=(!siteId||!apiToken)?'Tipp: NETLIFY_SITE_ID und NETLIFY_API_TOKEN als Env-Vars setzen fuer persistente Speicherung':'';
    return {statusCode:200,headers:json(),body:JSON.stringify({ok:true,method:'memory',key:key,hint:hint})};

  }catch(e){
    return {statusCode:500,headers:json(),body:JSON.stringify({error:e.message})};
  }
};
function cors(){return{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'};}
function json(){return Object.assign(cors(),{'Content-Type':'application/json'});}
