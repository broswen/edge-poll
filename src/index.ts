import {getPollState, Poll, PollState} from "./Poll";
import {getPollShardName, PollResponse, validatePollResponse} from "./PollShard";

export { Poll } from './Poll'
export { PollShard } from './PollShard'

const encoder = new TextEncoder()

export default {
  async fetch(request: Request, env: Env) {
    try {
      return await handleRequest(request, env)
    } catch (e) {
      return new Response(`${e}`)
    }
  }
}

async function handleRequest(request: Request, env: Env) {
  const url = new URL(request.url)
  const parts = url.pathname.slice(1).split('/')
  if (request.method === 'POST' && parts.length === 1 && parts[0] === 'poll') {
    if (!(await validateAPIKey(request.headers.get('api-key'), env))) {
      return new Response('unauthorized', {status: 401})
    }
    const id = env.POLL.newUniqueId()
    const obj = env.POLL.get(id)
    return obj.fetch(request)
  } else if (parts.length === 2 && parts[0] === 'poll') {
    const id = parts[1]
    const pollState = await getPollState(id, env)
    if (!pollState) {
      return new Response('not found', {status: 404})
    }

    if (request.method === 'GET') {
      const state = await env.POLLS.get<PollState>(id, 'json')
      if (!state) {
        return new  Response('not found', {status: 404})
      }
      return new  Response(JSON.stringify(state), {headers:{'Content-Type': 'application/json'}})
    } else if (request.method === 'PUT') {
      if (Date.now() < pollState.start || Date.now() > pollState.end) {
        return new  Response('poll not active', {status: 400})
      }
      const req = await request.json<{id: string}>()
      if(!('id' in req)) {
        return new Response('must specify choice id', {status: 400})
      }

      if (Number(req.id) >= Object.keys(pollState.choices).length || Number(req.id) < 0) {
        return new  Response('invalid choice', {status: 400})
      }
      const ip = request.headers.get('cf-connecting-ip') ?? ''
      const hash = await hashIP(ip)
      const shard = getPollShardName(id, pollState.shards, hash)
      const shardId = env.POLL_SHARD.idFromName(shard)
      const obj = env.POLL_SHARD.get(shardId)
      console.log({
        shard,
        shardId: shardId.toString()
      })
      return obj.fetch(request, {method: 'PUT', body: JSON.stringify({id: req.id, poll_id: id})})
    } else if (request.method === 'DELETE') {
      return new  Response('not implemented', {status: 501})

    } else {
      return new  Response('not allowed', {status: 405})
    }

  } else {
    return new  Response('not found', {status: 404})
  }
  return new Response(`OK`)
}

async function hashIP(ip: string): Promise<number> {
  const buf = await crypto.subtle.digest({name: 'SHA-256'}, encoder.encode(ip))
  const bytes = new Uint8Array(buf)
  let hash = 0
  for (const byte of bytes) {
    hash += byte
  }
  return hash
}

async function validateAPIKey(key: string | null | undefined, env: Env): Promise<boolean> {
  if (!key) return false
  return (await env.API_KEYS.get(key)) !== null
}

export interface Env {
  API_KEYS: KVNamespace,
  POLLS: KVNamespace,
  POLL: DurableObjectNamespace,
  POLL_SHARD: DurableObjectNamespace,
}
