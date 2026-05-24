/**
 * Curated lowercase Latin adjectives for generating camp usernames.
 *
 * Grouped by length bucket. Bucket is chosen by slug length so that
 * final `adjective + "_" + slug` lands around 14–16 chars total.
 *
 * Tone: positive / neutral / whimsical, camp-vibe.
 * Avoided: slurs, brand names, profanity, words that read awkward in Russian.
 */

/** 3–4 letter adjectives — for very long slugs (L ≥ 12). */
export const ADJ_TINY: readonly string[] = [
  'odd', 'wry', 'sly', 'apt', 'fab', 'fit', 'hot', 'icy', 'shy', 'sky',
  'top', 'wee', 'zen', 'big', 'fun', 'red', 'sun',
  'bold', 'calm', 'cool', 'cute', 'cozy', 'deep', 'easy', 'epic', 'fair',
  'fast', 'fine', 'foxy', 'glad', 'good', 'hazy', 'keen', 'kind', 'lush',
  'mild', 'neat', 'nice', 'okay', 'pure', 'racy', 'real', 'rich', 'sage',
  'soft', 'spry', 'tidy', 'true', 'warm', 'wild', 'wise', 'zany', 'busy',
  'free', 'mint', 'posh', 'rare', 'safe', 'snug', 'tame', 'vast',
];

/** 4–5 letter adjectives — for slugs L = 8–11. */
export const ADJ_SHORT: readonly string[] = [
  'agile', 'alert', 'aware', 'beamy', 'brave', 'brisk', 'cagey', 'candy',
  'cheer', 'chill', 'comfy', 'crisp', 'dandy', 'dizzy', 'dream', 'dusky',
  'eager', 'early', 'elder', 'extra', 'fiery', 'fizzy', 'flame', 'foggy',
  'fresh', 'funky', 'fuzzy', 'gaudy', 'giddy', 'glowy', 'goofy', 'great',
  'green', 'happy', 'hazel', 'hefty', 'honey', 'jolly', 'jumpy', 'lanky',
  'lemon', 'lilac', 'lithe', 'loyal', 'lucky', 'lunar', 'mango', 'merry',
  'misty', 'mossy', 'noble', 'nutty', 'peach', 'peppy', 'perky', 'plush',
  'polar', 'proud', 'puffy', 'punky', 'quiet', 'quick', 'rowdy', 'royal',
  'rusty', 'sassy', 'savvy', 'sharp', 'shiny', 'silky', 'silly', 'sleek',
  'slick', 'smart', 'snowy', 'solar', 'spicy', 'sunny', 'super', 'swift',
  'tipsy', 'witty', 'zesty', 'zippy', 'arty', 'rosy', 'dewy', 'glow',
  'edgy',
];

/** 6–8 letter adjectives — for slugs L = 5–7. */
export const ADJ_MEDIUM: readonly string[] = [
  'amazed', 'amused', 'ardent', 'artful', 'astute', 'breezy', 'bright',
  'bubbly', 'candid', 'chatty', 'cheery', 'chirpy', 'classy', 'clever',
  'comely', 'cosmic', 'cuddly', 'curious', 'daring', 'devout', 'doting',
  'dreamy', 'earthy', 'elated', 'elegant', 'eminent', 'fabled', 'festive',
  'flashy', 'fleecy', 'fluffy', 'frisky', 'frosty', 'gallant', 'genial',
  'gentle', 'genuine', 'gleeful', 'glossy', 'graceful', 'groovy', 'gusty',
  'hardy', 'hearty', 'helpful', 'heroic', 'hopeful', 'humble', 'jaunty',
  'jazzy', 'jocular', 'joyful', 'joyous', 'kindly', 'lavish', 'limber',
  'lively', 'lofty', 'lucent', 'lucid', 'magical', 'mellow', 'mighty',
  'mindful', 'modest', 'mystic', 'nimble', 'opulent', 'orderly', 'ornate',
  'peachy', 'pearly', 'peppery', 'placid', 'plucky', 'poetic', 'polite',
  'precise', 'prudent', 'puckish', 'quaint', 'quirky', 'radiant', 'regal',
  'restful', 'roguish', 'rustic', 'serene', 'sincere', 'snappy', 'soaring',
  'sparkly', 'spunky', 'stellar', 'stoic', 'strong', 'subtle', 'sublime',
  'sunlit', 'svelte', 'tactful', 'tender', 'trendy', 'tricky', 'trusty',
  'unique', 'urbane', 'valiant', 'velvety', 'verdant', 'winsome', 'worthy',
  'zealous', 'mischief', 'splendid', 'soothing', 'shimmer', 'tranquil',
  'wondrous', 'tireless',
];

/** 9–11 letter adjectives — for very short slugs (L ≤ 4). */
export const ADJ_LONG: readonly string[] = [
  'adorable', 'ambitious', 'auspicious', 'beguiling', 'benevolent',
  'bewitching', 'blissful', 'bounteous', 'breathless', 'brilliant',
  'capricious', 'celestial', 'charming', 'cheerful', 'chivalrous',
  'cinematic', 'colorful', 'comforting', 'composed', 'confident',
  'contented', 'courteous', 'crackling', 'dazzling', 'delicate',
  'delicious', 'delightful', 'determined', 'devoted', 'diligent',
  'dynamic', 'eccentric', 'effortless', 'enchanted', 'energetic',
  'enigmatic', 'ethereal', 'euphoric', 'exquisite', 'exuberant',
  'fanciful', 'fantastic', 'fearless', 'flickering', 'fortunate',
  'fragrant', 'frolicking', 'generous', 'gleaming', 'glistening',
  'glittering', 'gorgeous', 'graceful', 'gracious', 'grateful',
  'gregarious', 'harmonious', 'honorable', 'humorous', 'idealistic',
  'illustrious', 'imaginative', 'incandescent', 'industrious', 'ingenious',
  'innocent', 'inspired', 'intrepid', 'inventive', 'invincible', 'jubilant',
  'judicious', 'kindhearted', 'laudable', 'legendary', 'limitless',
  'luminous', 'luxuriant', 'magnetic', 'magnificent', 'majestic',
  'marvelous', 'meandering', 'meticulous', 'midnight', 'mirthful',
  'mischievous', 'mysterious', 'nonchalant', 'observant', 'optimistic',
  'outstanding', 'passionate', 'peaceful', 'persistent', 'picturesque',
  'playful', 'pleasant', 'plentiful', 'polished', 'prismatic', 'prosperous',
  'quixotic', 'rambunctious', 'rapturous', 'reflective', 'refreshing',
  'resilient', 'resolute', 'reverent', 'shimmering', 'slumbering',
  'spectacular', 'spirited', 'sprightly', 'stalwart', 'starlit',
  'steadfast', 'stupendous', 'sunkissed', 'thoughtful', 'thrilling',
  'twinkling', 'unhurried', 'unstoppable', 'uplifted', 'valorous',
  'velveteen', 'venturous', 'vibrant', 'victorious', 'vigilant', 'vigorous',
  'virtuous', 'vivacious', 'whimsical', 'wholesome', 'youthful', 'zestful',
];

export type AdjectiveBucket = 'tiny' | 'short' | 'medium' | 'long';

/** Adjectives grouped by bucket. */
export const ADJECTIVES_BY_BUCKET: Record<AdjectiveBucket, readonly string[]> = {
  tiny: ADJ_TINY,
  short: ADJ_SHORT,
  medium: ADJ_MEDIUM,
  long: ADJ_LONG,
};

/** Hard cap on camp_username length. Falls back to shorter bucket if exceeded. */
export const MAX_CAMP_USERNAME_LEN = 22;

/** Separator between adjective and slug. */
export const CAMP_USERNAME_SEPARATOR = '_';
