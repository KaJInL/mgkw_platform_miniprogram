import type { BeadPatternResult } from "@/common/utils/beadPattern";

let latestPattern: BeadPatternResult | null = null;

const beadPatternSession = {
  set(pattern: BeadPatternResult) {
    latestPattern = pattern;
  },
  get() {
    return latestPattern;
  },
};

export default beadPatternSession;
