import { createMachine } from 'xstate';

export const voiceMachine = createMachine({
    id: 'voice',
    initial: 'idle',
    states: {
        idle: {
            on: {
                TOGGLE: 'listening',
                START_LISTENING: 'listening'
            }
        },
        listening: {
            on: {
                TOGGLE: 'idle',
                STOP_LISTENING: 'idle',
                PROCESS: 'processing',
                ERROR: 'error'
            }
        },
        processing: {
            on: {
                FINISH: 'idle',
                SPEAK: 'speaking',
                ERROR: 'error'
            }
        },
        speaking: {
            on: {
                FINISH: 'idle',
                RESUME_LISTENING: 'listening',
                ERROR: 'error'
            }
        },
        error: {
            on: {
                RETRY: 'idle'
            }
        }
    }
});
