const required = ['nome','telefone','clinica','cidade','segmentos','salas','profissionais','funcionarios','clientes_dia','faturamento_mensal','percentual_cartao','percentual_pix','percentual_dinheiro','percentual_boleto','parcelamento','despesas_mensais','meta_2027'];
const nums = ['salas','profissionais','funcionarios','clientes_dia','faturamento_mensal','percentual_cartao','percentual_pix','percentual_dinheiro','percentual_boleto','despesas_mensais','meta_2027'];
const pct = ['percentual_cartao','percentual_pix','percentual_dinheiro','percentual_boleto'];
const textFields = ['nome','telefone','clinica','cidade','parcelamento'];
const money = n => Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function check(data){
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Dados inválidos.';
  for (const k of required) if (data[k] === null || data[k] === undefined || data[k] === '') return `Campo obrigatório: ${k}`;
  for (const k of textFields) if (typeof data[k] !== 'string' || !data[k].trim() || data[k].length > 180) return `Campo inválido: ${k}`;
  if (!/^\+?[0-9 ()-]{10,20}$/.test(data.telefone)) return 'Informe um WhatsApp válido com DDD.';
  if (!Array.isArray(data.segmentos) || !data.segmentos.length || data.segmentos.length > 8 || data.segmentos.some(s => typeof s !== 'string' || s.length > 100)) return 'Selecione um segmento válido.';
  for (const k of nums) if (typeof data[k] !== 'number' || !Number.isFinite(data[k]) || data[k] < 0 || data[k] > 1000000000) return `Número inválido: ${k}`;
  for (const k of ['salas','profissionais','funcionarios','clientes_dia',...pct]) if (!Number.isInteger(data[k])) return `Número inteiro obrigatório: ${k}`;
  if (pct.some(k=>data[k]>100) || pct.reduce((a,k)=>a+data[k],0) !== 100) return 'As formas de pagamento devem somar 100%.';
  if (data.consentimento !== true) return 'É necessário consentir com o contato e tratamento dos dados.';
  return null;
}
function getWhatsAppParts(d){
  return [
    d.nome, d.telefone, d.clinica, d.cidade,
    d.segmentos.join(', '),
    `${d.salas} salas; ${d.profissionais} profissionais; ${d.funcionarios} funcionários`,
    String(d.clientes_dia),
    money(d.faturamento_mensal),
    `Cartão ${d.percentual_cartao}%; Pix ${d.percentual_pix}%; dinheiro ${d.percentual_dinheiro}%; boleto ${d.percentual_boleto}%`,
    d.parcelamento, money(d.despesas_mensais), money(d.meta_2027)
  ];
}
async function supabase(path, method, body, extras={}) {
  const base=process.env.SUPABASE_URL?.replace(/\/$/,'');
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base || !key) throw new Error('Banco de dados não configurado');
  const response=await fetch(`${base}/rest/v1/${path}`,{
    method,
    headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...extras},
    body:body===undefined?undefined:JSON.stringify(body)
  });
  if(!response.ok) throw new Error(`Supabase HTTP ${response.status}: ${(await response.text()).slice(0,400)}`);
  return response.status===204?null:response.json();
}
async function whatsapp(d){
  const token=process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to=process.env.WHATSAPP_TO;
  const template=process.env.WHATSAPP_TEMPLATE_NAME;
  if(!token||!phoneId||!to||!template) return {status:'nao_configurado'};
  const language=process.env.WHATSAPP_TEMPLATE_LANGUAGE||'pt_BR';
  const apiVersion=process.env.META_GRAPH_VERSION||'v23.0';
  const resp=await fetch(`https://graph.facebook.com/${apiVersion}/${phoneId}/messages`,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({messaging_product:'whatsapp',to,type:'template',template:{name:template,language:{code:language},components:[{type:'body',parameters:getWhatsAppParts(d).map(text=>({type:'text',text}))}]}})
  });
  const result=await resp.json().catch(()=>({}));
  if(!resp.ok) throw new Error(`Meta HTTP ${resp.status}: ${JSON.stringify(result).slice(0,300)}`);
  return {status:'enviada', id:result.messages?.[0]?.id || null};
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'Método não permitido.'});
  try {
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    // Honeypot. Descarta robôs sem armazenar dados.
    if(body?.website) return res.status(200).json({ok:true});
    const error=check(body);
    if(error) return res.status(400).json({error});
    const entry=Object.fromEntries(required.map(k=>[k,body[k]]));
    entry.consentimento=true;
    const data=await supabase('diagnosticos_estetica','POST',entry,{Prefer:'return=representation'});
    const id=data?.[0]?.id;
    if(!id) throw new Error('Não foi possível confirmar o salvamento.');
    let note={status:'pendente'};
    try {note=await whatsapp(body);} catch(err){note={status:'erro',error:String(err.message).slice(0,300)};console.error('WhatsApp:',err);}
    try {
      await supabase(`diagnosticos_estetica?id=eq.${encodeURIComponent(id)}`,'PATCH',{
        notificacao_whatsapp:note.status, whatsapp_message_id:note.id||null, notificacao_erro:note.error||null
      });
    } catch(err){console.error('Status WhatsApp:',err);}
    return res.status(201).json({ok:true,id});
  }catch(err){console.error('Falha no formulário:',err);return res.status(500).json({error:'Não foi possível salvar agora. Tente novamente.'});}
}
