// Named timing profiles for frame generation.
//
// `seed` pins the jitter PRNG so a profile always produces the same delays for
// the same input text — determinism is the whole point of this project.
export const TIMING_PROFILES = {
  steady: {
    baseDelayMs: 40,
    jitterMs: 0,
    punctuationPauseMs: 0,
    newlinePauseMs: 0,
    seed: 1,
  },
  natural: {
    baseDelayMs: 45,
    jitterMs: 25,
    punctuationPauseMs: 180,
    newlinePauseMs: 260,
    seed: 1,
  },
};

export function resolveProfile(nameOrProfile) {
  if (typeof nameOrProfile === "object" && nameOrProfile !== null) {
    return { ...TIMING_PROFILES.steady, ...nameOrProfile };
  }
  const profile = TIMING_PROFILES[nameOrProfile];
  if (!profile) {
    const known = Object.keys(TIMING_PROFILES).join(", ");
    throw new Error(`unknown timing profile "${nameOrProfile}" (known: ${known})`);
  }
  return { ...profile };
}
