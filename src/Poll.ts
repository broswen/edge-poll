import {Env} from "./index";

export interface Choice {
  id: string
  title: string
  count: number
}

export interface PollState {
  title: string
  description: string
  created: number
  start: number
  end: number
  shardStates: {
    [key: string]: {
      choices: {
        [key: string]: Choice
      }
    }
  },
  choices: {
    [key: string]: Choice
  },
  shards: number
}

const DEFAULT_POLL_STATE: PollState = {
  shardStates: {}, choices:{}, created: 0, description: "", end: 0, shards: 0, start: 0, title: ""
}

export interface CreatePollRequest {
  title: string
  description: string
  start: number
  end: number
  shards: number
  choices: string[]
}

export function validateCreatePollRequest(obj: any): obj is CreatePollRequest {
  if (!('title' in obj)) {
    return false
  }
  if (obj.title === '') {
    return false
  }

  if (!('description' in obj)){
    return false
  }
  if (!('start' in obj) || isNaN(obj.start)){
    return false
  }
  if (!('end' in obj) || isNaN(obj.end)){
    return false
  }
  if (!('shards' in obj) || isNaN(obj.shards)){
    return false
  }
  if (!('choices' in obj) ){
    return false
  }

  if (!Array.isArray(obj.choices)) {
    return false
  }

  if (obj.choices.length < 1) {
    return false
  }

  return true
}

export interface ShardUpdate {
  shard: string
  choices: {
    [key: string]: Choice
  }
}

export class Poll {
  state: DurableObjectState
  pollState: PollState = DEFAULT_POLL_STATE
  env: Env

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
    state.blockConcurrencyWhile(async () => {
      this.pollState = (await this.state.storage?.get<PollState>('state')) ?? DEFAULT_POLL_STATE
    })
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    if (request.method === 'GET') {
      //  return local state
      return new Response(JSON.stringify(this.pollState), {headers:{'Content-Type': 'application/json'}})
    } else if (request.method === 'POST') {
      console.log(`POST: ${this.state.id.toString()}`)
      const req = await request.json<CreatePollRequest>()
      if (validateCreatePollRequest(req)) {
        this.pollState = {
          title: req.title,
          description: req.description,
          created: Date.now(),
          start: req.start,
          end: req.end,
          choices: createChoices(req.choices),
          shardStates: {},
          shards: req.shards
        }
      } else {
        return new Response('bad request', {status: 400})
      }

      this.state.storage?.put('state', this.pollState)
      await this.env.POLLS.put(this.state.id.toString(), JSON.stringify(this.pollState))
      return new Response(JSON.stringify({id: this.state.id.toString()}))
    } else if (request.method === 'PUT') {
      const update = await request.json<ShardUpdate>()
      this.pollState = consumeShardUpdate(this.pollState, update)
      this.state.storage?.put('state', this.pollState)
      await this.env.POLLS.put(this.state.id.toString(), JSON.stringify(this.pollState))
      return new Response('ok')
    } else if (request.method === 'DELETE') {
      this.state.storage?.deleteAll()
      return new Response('ok')
    } else {
      return new Response('not allowed', {status: 405})
    }
  }
}

export function createChoices(titles: string[]): {[key: string]: Choice} {
  const choices: {[key:string]: Choice} = {}
  for (let i = 0; i < titles.length; i++) {
    choices[i.toString()] = {
      id: i.toString(),
      title: titles[i] ,
      count: 0
    }
  }
  return choices
}

export function consumeShardUpdate(pollState: PollState, update: ShardUpdate): PollState {
  const tempState: {[key: string]: Choice} = JSON.parse(JSON.stringify(pollState.choices))
  for (const choice of Object.values(tempState)) {
    choice.count = 0
  }
  // update local shard state
  pollState.shardStates[update.shard] = {choices: {...update.choices}}
  // accumulate all local shard states
  for (const shardState of Object.values(pollState.shardStates)) {
    for (const choice of Object.values(shardState.choices)) {
      if (choice.id in tempState) {
        tempState[choice.id].count += choice.count
      } else {
        tempState[choice.id] = {...choice}
      }
    }
  }
  pollState.choices = tempState
  return pollState
}

export async function getPollState(id: string, env: Env): Promise<PollState | null> {
  return await env.POLLS.get<PollState>(id, 'json')
}