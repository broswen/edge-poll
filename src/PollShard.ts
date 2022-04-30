import {Env} from "./index";
import {Choice, ShardUpdate} from "./Poll";

const SHARD_UPDATE_COOLDOWN = 1000

export interface PollShardState {
  lastUpdate: number
  choices: {
    [key: string]: Choice
  }
}

const DEFAULT_SHARD_STATE: PollShardState = {
  choices: {}, lastUpdate: 0
}

export interface PollResponse {
  poll_id: string,
  id: string,
}

export function validatePollResponse(obj: any): obj is PollResponse {
  if (!('id' in obj) || isNaN(obj.id)) {
    return false
  }
  return true
}

export class PollShard {
  state: DurableObjectState
  env: Env
  pollShardState: PollShardState = DEFAULT_SHARD_STATE

  constructor(state: DurableObjectState, env: Env) {
    this.env = env
    this.state = state
    state.blockConcurrencyWhile(async () => {
      this.pollShardState = (await this.state.storage?.get<PollShardState>('state')) ?? DEFAULT_SHARD_STATE
    })
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    if (request.method === 'PUT') {
      const ip = request.headers.get('cf-connecting-ip') ?? ''
      const prevResponse = await this.state.storage?.get<number>(ip)
      if (prevResponse !== undefined) {
        console.log(`duplicate vote`, ip)
        return new Response('ok')
      }
      const req = await request.json<PollResponse>()
      this.state.storage?.put(ip, req.id)
      console.log('before', JSON.stringify(this.pollShardState))
      if (req.id in this.pollShardState.choices) {
        this.pollShardState.choices[req.id].count += 1
      } else {
        this.pollShardState.choices[req.id] = {id: req.id, title: '', count: 1}
      }
      console.log('after', JSON.stringify(this.pollShardState))
      if (Date.now() - (this.pollShardState.lastUpdate) > SHARD_UPDATE_COOLDOWN) {
        this.pollShardState.lastUpdate = Date.now()
        const update: ShardUpdate = {
          shard: this.state.id.toString(),
          choices: this.pollShardState.choices
        }
        const id = this.env.POLL.idFromString(req.poll_id)
        const obj = this.env.POLL.get(id)
        console.log(JSON.stringify(update))
        await obj.fetch(new Request(request.url, {method: 'PUT', body: JSON.stringify(update)}))
      }
      this.state.storage?.put('state', this.pollShardState)
      return new Response('ok')
    } else if (request.method === 'DELETE') {
      this.state.storage?.deleteAll()
      return new Response('ok')
    } else {
      return new Response('not allowed', {status: 405})
    }
  }

}

export function getPollShardNames(id: string, shards: number): string[] {
  const names: string[] = []
  for (let i = 0; i < shards; i++) {
    names.push(`${id}-${i}`)
  }
  return names
}

export function getPollShardName(id: string, shards: number, hash: number): string {
  const mod = hash % shards
  return `${id}-${mod}`
}