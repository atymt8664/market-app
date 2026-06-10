export type EmojiCategoryId =
  | "smileys"
  | "gestures"
  | "hearts"
  | "animals"
  | "food"
  | "travel"
  | "objects"
  | "symbols";

export type EmojiCategory = {
  id: EmojiCategoryId;
  labelKey: string;
  tabIcon: string;
  emojis: readonly string[];
};

export const CHAT_EMOJI_CATEGORIES: readonly EmojiCategory[] = [
  {
    id: "smileys",
    labelKey: "message_thread.emoji_cat_smileys",
    tabIcon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊",
      "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜",
      "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶",
      "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒",
      "🤕", "🤢", "🤮", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐",
      "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨",
      "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱",
    ],
  },
  {
    id: "gestures",
    labelKey: "message_thread.emoji_cat_gestures",
    tabIcon: "👍",
    emojis: [
      "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👌", "🤌",
      "🤏", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤙",
      "💪", "🦾", "🖕", "✍️", "🙏", "🤝", "👏", "🙌", "👐", "🤲", "🤜", "🫶",
      "🫡", "🫢", "🫣", "🫠", "🫥",
    ],
  },
  {
    id: "hearts",
    labelKey: "message_thread.emoji_cat_hearts",
    tabIcon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕",
      "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️", "💋", "💌", "💐", "🌹",
    ],
  },
  {
    id: "animals",
    labelKey: "message_thread.emoji_cat_animals",
    tabIcon: "🐶",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮",
      "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺",
      "🐗", "🐴", "🦄", "🐝", "🪲", "🦋", "🐌", "🐞", "🐢", "🐍", "🦎", "🐙",
    ],
  },
  {
    id: "food",
    labelKey: "message_thread.emoji_cat_food",
    tabIcon: "🍕",
    emojis: [
      "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑",
      "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🍆", "🥕", "🌽", "🍕", "🍔", "🍟",
      "🌭", "🍿", "🧁", "🍰", "🎂", "🍩", "🍪", "☕", "🍵", "🧃", "🥤", "🍺",
    ],
  },
  {
    id: "travel",
    labelKey: "message_thread.emoji_cat_travel",
    tabIcon: "🚗",
    emojis: [
      "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚",
      "🚛", "🚜", "🏍️", "🛵", "🚲", "✈️", "🛫", "🛬", "🚀", "🛸", "🚁", "🛶",
      "⛵", "🚤", "🛳️", "⚓", "🏠", "🏡", "🏢", "🏬", "🏥", "🏫", "🏰", "🗼",
    ],
  },
  {
    id: "objects",
    labelKey: "message_thread.emoji_cat_objects",
    tabIcon: "💡",
    emojis: [
      "⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "📷", "📸", "📹", "🎥", "📞", "☎️",
      "📺", "📻", "🎙️", "🎚️", "🎛️", "⏰", "⏱️", "🔋", "🔌", "💡", "🔦", "🕯️",
      "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "💰", "💳", "💎", "⚖️", "🔧",
    ],
  },
  {
    id: "symbols",
    labelKey: "message_thread.emoji_cat_symbols",
    tabIcon: "✨",
    emojis: [
      "❤️‍🔥", "💯", "💢", "💥", "💫", "💦", "💨", "🕳️", "💣", "💬", "👁️‍🗨️", "🗨️",
      "🗯️", "💭", "💤", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤",
      "✅", "❌", "❓", "❗", "‼️", "⁉️", "🔅", "🔆", "⚠️", "🚸", "🔱", "✨",
    ],
  },
] as const;

export function filterEmojiCategories(query: string): EmojiCategory[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...CHAT_EMOJI_CATEGORIES];
  return CHAT_EMOJI_CATEGORIES.map((cat) => ({
    ...cat,
    emojis: cat.emojis.filter((e) => e.includes(q) || cat.id.includes(q)),
  })).filter((cat) => cat.emojis.length > 0);
}

export function flattenCategoryEmojis(categories: readonly EmojiCategory[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cat of categories) {
    for (const emoji of cat.emojis) {
      if (!seen.has(emoji)) {
        seen.add(emoji);
        out.push(emoji);
      }
    }
  }
  return out;
}
