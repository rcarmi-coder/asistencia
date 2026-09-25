import confetti from 'canvas-confetti';

export function fireLevelUpConfetti() {
  confetti({
    particleCount: 50,
    spread: 70,
    origin: { y: 0.7 },
    colors: ['#22d3ee', '#facc15', '#4ade80', '#c084fc', '#f87171'],
  });
}

export function fireAllPresentConfetti() {
  confetti({
    particleCount: 100,
    spread: 100,
    origin: { y: 0.6 },
    colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'],
  });
}
