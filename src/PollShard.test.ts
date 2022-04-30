import {getPollShardName, getPollShardNames} from "./PollShard";


test('get poll shard names', () => {
    const tests: {id: string, shards: number, names: string[]}[] = [
        {
            id: 'test',
            shards: 3,
            names: ["test-0", "test-1", "test-2"]
        },
        {
            id: 'test',
            shards: 1,
            names: ["test-0"]
        },
        {
            id: 'test',
            shards: 3,
            names: ["test-0", "test-1", "test-2"]
        },
    ]
    for (const test of tests) {
        expect(getPollShardNames(test.id, test.shards)).toStrictEqual(test.names)
    }
})

test('get poll shard name by modulus', () => {
    const tests: {id: string, shards: number, hash: number, name: string}[] = [
        {
            id: 'test',
            shards: 3,
            hash : 4,
            name: 'test-1'
        },
        {
            id: 'test',
            shards: 3,
            hash : 0,
            name: 'test-0'
        },
        {
            id: 'test',
            shards: 3,
            hash : 2,
            name: 'test-2'
        },
        {
            id: 'test',
            shards: 3,
            hash : 3,
            name: 'test-0'
        },
    ]
    for (const test of tests) {
        expect(getPollShardName(test.id, test.shards, test.hash)).toEqual(test.name)
    }
})
