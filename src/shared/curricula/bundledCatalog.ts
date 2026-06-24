import type { Curriculum } from '../contracts/learning'

export const BUNDLED_CATALOG: Curriculum[] = [
  {
    id: 'bundled:neurodeck-quick-start',
    title: 'NeuroDeck Quick Start',
    area: 'steam-deck-system-skills',
    description:
      'A short hands-on introduction to NeuroDeck: open the terminal, run your first command, and understand how workspaces keep your work organized.',
    modules: [
      {
        id: 'basics',
        title: 'Basics',
        lessons: [
          {
            id: 'what-is-neurodeck',
            type: 'read',
            title: 'What is NeuroDeck?',
            estimatedMinutes: 3,
            instructions:
              'NeuroDeck is a controller-first productivity shell for the Steam Deck and other handheld PCs. It wraps workspaces, files, Git, terminals, remote systems, and AI tooling into a single gamepad-friendly interface.\n\nEverything you do lives inside a workspace. A workspace is just a folder on disk. Pick one of your own projects, or create a new folder, and NeuroDeck will remember it.',
            objectives: [
              { id: 'o1', text: 'Understand that NeuroDeck organizes work into workspaces.' },
              {
                id: 'o2',
                text: 'Know that the Terminal and File Manager are scoped to the active workspace.'
              }
            ],
            requiredTools: [],
            hints: [
              { id: 'h1', text: 'Open the Home screen and press A on Workspaces to see your list.' }
            ]
          },
          {
            id: 'open-terminal',
            type: 'lab',
            title: 'Open the Terminal',
            estimatedMinutes: 5,
            instructions:
              "In this lab you will open NeuroDeck's built-in terminal and run a simple command in your active workspace.\n\n1. Make sure a workspace is active (the status area shows the workspace name).\n2. The terminal pane on the right is already open in your workspace root.\n3. Type `pwd` and press Enter to confirm the working directory.",
            objectives: [
              { id: 'o1', text: 'Run the pwd command in the workspace terminal.' },
              { id: 'o2', text: 'Confirm the printed path matches the active workspace root.' }
            ],
            hints: [
              {
                id: 'h1',
                text: 'If no workspace is active, go back and select or create one first.'
              },
              { id: 'h2', text: 'The terminal runs the same shell you use outside NeuroDeck.' }
            ],
            setupCommand: 'pwd',
            requiredTools: ['terminal']
          }
        ]
      }
    ],
    requiredTools: ['terminal'],
    offline: true,
    bundled: true,
    createdAt: 0
  }
]
