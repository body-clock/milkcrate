# Crate Animation Spec

## What it must do

You're looking into a milk crate from the top. Records are stacked front-to-back. The front record is fully visible. Behind it, 2-3 records are visible as progressively smaller depth layers.

## Forward (next record)

```
BEFORE:                AFTER:
┌──────────┐          
│  Record A │ (full)     ┌──────────┐
│          │             │  Record B │ (full, was behind A)
└──────────┘             │          │
    Record B (depth 1)   └──────────┘
    Record C (depth 2)       Record C (depth 1)
    Record D (depth 3)       Record D (depth 2)
```

1. User drags Record A DOWN past 80px threshold
2. Record A fades to opacity 0 in place (0.2s easeOut)
3. Record B was already visible behind A → it's now the front record
4. Record C, D shift one position deeper in the stack
5. Depth cards scale/offset update smoothly (motion.layout)

## Backward (previous record)

```
BEFORE:                AFTER:
┌──────────┐          
│  Record B │ (full)     ┌──────────┐
│          │             │  Record A │ (full, slides up from below)
└──────────┘             │          │
    Record C (depth 1)   └──────────┘
    Record D (depth 2)       Record B (depth 1)
                              Record C (depth 2)
```

1. User presses ↑ or drags UP past 80px threshold
2. Record B fades to opacity 0 in place (0.2s easeOut)
3. Record A slides UP from below (y: 60 → 0, opacity 0 → 1, 0.2s easeOut)
4. Stack shifts: old depth cards move one position forward

## Depth cards

- Records at positions 1, 2, 3 in the stack are visible behind the active card
- They are the same base size as the active card
- Position 1: scale(0.92), offset down 14px, visible at bottom
- Position 2: scale(0.84), offset down 28px, visible at bottom
- Position 3: scale(0.76), offset down 42px, visible at bottom
- No opacity changes (real records aren't transparent)
- Transitions between positions use layout animation (smooth shifting)

## Drag

- Only the active card (position 0) is draggable
- Drag down (y > 0): pull toward you → navigate forward
- Drag up (y < 0): push away → navigate backward
- Threshold: 80px to trigger
- Below threshold: card springs back to origin
- During drag: card scales to 0.97 for tactile feedback
