import {
    Choice,
    consumeShardUpdate,
    createChoices,
    CreatePollRequest,
    PollState,
    ShardUpdate,
    validateCreatePollRequest
} from "./Poll";


test('test create poll request guard', () => {
    const tests: {request: any, valid: boolean}[] = [
        {
            request: {
                title: 'test poll',
                description: 'this is a test',
                shards: 3,
                end: Date.now(),
                start: Date.now(),
                choices: ['a', 'b']
            },
            valid: true
        },
        {
            request: {
                title: 'test poll',
                description: 'this is a test',
                shards: 3,
                end: Date.now(),
                start: Date.now(),
                choices: []
            },
            valid: false
        },
        {
            request: {
                title: 'test poll',
                description: 'this is a test',
                shards: 3,
                end: 'a',
                start: Date.now(),
                choices: ['a', 'b']
            },
            valid: false
        },
        {
            request: {
                title: '',
                description: 'this is a test',
                shards: 3,
                end: Date.now(),
                start: Date.now(),
                choices: ['a', 'b']
            },
            valid: false
        },
        {
            request: {
                title: 'test poll',
                description: 'this is a test',
                shards: 'a',
                end: Date.now(),
                start: Date.now(),
                choices: ['a', 'b']
            },
            valid: false
        },
        {
            request: {
                title: 'test poll',
                description: 'this is a test',
                shards: 3,
                end: Date.now(),
                start: Date.now(),
                choices: 2
            },
            valid: false
        }
    ]
    for (const test of tests) {
        expect(validateCreatePollRequest(test.request)).toStrictEqual(test.valid)
    }
})

describe('test consume shard update', () => {
    const tests: {state: PollState, update: ShardUpdate, expectedState: PollState}[] = [
        {
            state: {
                created: 0, description: "", end: 0, shards: 0, start: 0, title: "",
                shardStates: {},
                choices: {}
            },
            update: {shard: '1', choices: {
                '0': {id: '0', title: '0', count: 0},
                '1': {id: '1', title: '1', count: 1},
                '2': {id: '2', title: '2', count: 2},
                }
            },
            expectedState: {
                created: 0, description: "", end: 0, shards: 0, start: 0, title: "",
                shardStates: {
                    '1': {
                        choices: {
                            '0': {id: '0', title: '0', count: 0},
                            '1': {id: '1', title: '1', count: 1},
                            '2': {id: '2', title: '2', count: 2},
                        }
                    }
                },
                choices: {
                    '0': {id: '0', title: '0', count: 0},
                    '1': {id: '1', title: '1', count: 1},
                    '2': {id: '2', title: '2', count: 2},
                }
            },
        },
        {
            state: {
                created: 0, description: "", end: 0, shards: 0, start: 0, title: "",
                shardStates: {
                    '1': {
                        choices: {
                            '0': {id: '0', title: '0', count: 0},
                            '1': {id: '1', title: '1', count: 1},
                            '2': {id: '2', title: '2', count: 2},
                        }
                    }
                },
                choices: {
                    '0': {id: '0', title: '0', count: 0},
                    '1': {id: '1', title: '1', count: 1},
                    '2': {id: '2', title: '2', count: 2},
                }
            },
            update: {shard: '2', choices: {
                    '0': {id: '0', title: '0', count: 0},
                    '1': {id: '1', title: '1', count: 1},
                    '2': {id: '2', title: '2', count: 2},
                }
            },
            expectedState: {
                created: 0, description: "", end: 0, shards: 0, start: 0, title: "",
                shardStates: {
                    '1': {
                        choices: {
                            '0': {id: '0', title: '0', count: 0},
                            '1': {id: '1', title: '1', count: 1},
                            '2': {id: '2', title: '2', count: 2},
                        }
                    },
                    '2': {
                        choices: {
                            '0': {id: '0', title: '0', count: 0},
                            '1': {id: '1', title: '1', count: 1},
                            '2': {id: '2', title: '2', count: 2},
                        }
                    }
                },
                choices: {
                    '0': {id: '0', title: '0', count: 0},
                    '1': {id: '1', title: '1', count: 2},
                    '2': {id: '2', title: '2', count: 4},
                }
            },
        },
        {
            state: {
                created: 0, description: "", end: 0, shards: 0, start: 0, title: "",
                shardStates: {
                },
                choices: {
                    '0': {id: '0', title: '0', count: 0},
                    '1': {id: '1', title: '1', count: 0},
                    '2': {id: '2', title: '2', count: 0},
                }
            },
            update: {shard: '1', choices: {
                    '0': {id: '0', title: '0', count: 1},
                }
            },
            expectedState: {
                created: 0, description: "", end: 0, shards: 0, start: 0, title: "",
                shardStates: {
                    '1': {
                        choices: {
                            '0': {id: '0', title: '0', count: 1},
                        }
                    },
                },
                choices: {
                    '0': {id: '0', title: '0', count: 1},
                    '1': {id: '1', title: '1', count: 0},
                    '2': {id: '2', title: '2', count: 0},
                }
            },
        },
        {
            state: {
                created: 0, description: "", end: 0, shards: 0, start: 0, title: "",
                shardStates: {
                    '1': {
                        choices: {
                            '0': {id: '0', title: '0', count: 1},
                        }
                    },
                },
                choices: {
                    '0': {id: '0', title: '0', count: 1},
                    '1': {id: '1', title: '1', count: 0},
                    '2': {id: '2', title: '2', count: 0},
                }
            },
            update: {
                shard: '2', choices: {
                    '1': {id: '1', title: '1', count: 1},
                }
            },
            expectedState: {
                created: 0, description: "", end: 0, shards: 0, start: 0, title: "",
                shardStates: {
                    '1': {
                        choices: {
                            '0': {id: '0', title: '0', count: 1},
                        }
                    },
                    '2': {
                        choices: {
                            '1': {id: '1', title: '1', count: 1},
                        }
                    },
                },
                choices: {
                    '0': {id: '0', title: '0', count: 1},
                    '1': {id: '1', title: '1', count: 1},
                    '2': {id: '2', title: '2', count: 0},
                }
            }
        }
    ]
    for (const tc of tests) {
        test('', () => {
            expect(consumeShardUpdate(tc.state, tc.update)).toStrictEqual(tc.expectedState)
        })
    }
})

describe('test create choices', () => {
    const tests: {titles: string[], choices: {[key:string]: Choice}}[] = [
        {
            titles: ['a', 'b', 'c'],
            choices: {
                '0': {id: '0', title: 'a', count: 0},
                '1': {id: '1', title: 'b', count: 0},
                '2': {id: '2', title: 'c', count: 0}
            }
        }
    ]
    for (const tc of tests) {
        test('', () => {
            expect(createChoices(tc.titles)).toStrictEqual(tc.choices)
        })
    }
})