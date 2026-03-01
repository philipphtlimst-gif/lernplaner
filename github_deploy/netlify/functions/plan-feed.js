// netlify/functions/plan-feed.js
exports.handler = async function(event) {
  if(event.httpMethod==='OPTIONS') return {statusCode:204,headers:h()};

  var token=((event.queryStringParameters)||{}).token||'default';
  var key='plan_'+String(token).replace(/[^a-z0-9]/gi,'_').slice(0,32);

  // Methode 1: NETLIFY_BLOBS_CONTEXT
  var ctx=process.env.NETLIFY_BLOBS_CONTEXT;
  if(ctx){
    try{
      var c=JSON.parse(Buffer.from(ctx,'base64').toString('utf-8'));
      var r=await fetch(c.url+'/lernplan/'+key,{headers:{'Authorization':'Bearer '+c.token}});
      if(r.ok){var t=await r.text();if(t.indexOf('BEGIN:VCALENDAR')>=0)return{statusCode:200,headers:h(),body:t};}
    }catch(e){console.warn('Blobs ctx error:',e.message);}
  }

  // Methode 2: Netlify Blobs via API
  var siteId=process.env.NETLIFY_SITE_ID||process.env.SITE_ID;
  var apiToken=process.env.NETLIFY_API_TOKEN;
  if(siteId && apiToken){
    try{
      var blobUrl='https://api.netlify.com/api/v1/blobs/'+siteId+'/lernplan/'+key;
      var r2=await fetch(blobUrl,{headers:{'Authorization':'Bearer '+apiToken}});
      if(r2.ok){var t2=await r2.text();if(t2.indexOf('BEGIN:VCALENDAR')>=0)return{statusCode:200,headers:h(),body:t2};}
    }catch(e){console.warn('Blobs API error:',e.message);}
  }

  // Methode 3: Memory
  var cached=(global._c||{})[key];
  if(cached) return{statusCode:200,headers:h(),body:cached};

  return{statusCode:200,headers:h(),body:'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//LernPlaner//DE\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:LernPlaner\r\nX-PUBLISHED-TTL:PT15M\r\nEND:VCALENDAR'};
};
function h(){return{'Content-Type':'text/calendar; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache, no-store','Pragma':'no-cache','Expires':'0'};}
