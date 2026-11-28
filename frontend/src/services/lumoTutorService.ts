// AI-ready Lumo Tutor service tailored for Tiếng Anh 1 - Global Success (Primary School).
// Set LUMO_AI_ENDPOINT when backend LLM chat API is connected.

export type LumoMood =
  | 'default'
  | 'happy'
  | 'thinking'
  | 'headphones'
  | 'reading'
  | 'oops'
  | 'cool';

export const LUMO_MOOD_IMAGE: Record<LumoMood, string> = {
  default: '/mascot-lumo.webp',
  happy: '/mascot-lumo-happy.webp',
  thinking: '/mascot-lumo-thinking.webp',
  headphones: '/mascot-lumo-headphones.webp',
  reading: '/mascot-lumo-reading.webp',
  oops: '/mascot-lumo-oops.webp',
  cool: '/mascot-lumo-cool.webp',
};

export type LumoContext = {
  pathname: string;
  search: string;
};

export const LUMO_SUGGESTION_POOL: string[] = [
  'Tiếng Anh lớp 1 học những gì?',
  'Học Phonics là học gì vậy Lumo?',
  'Bé nên bắt đầu từ Unit nào?',
  'Mỗi ngày bé nên học mấy phút?',
  'Mẫu câu Unit 1 đến Unit 4 là gì?',
  'Mẫu câu Unit 5 đến Unit 8 là gì?',
  'Học kỳ 2 có những chủ đề nào?',
  'Làm sao để bé nhớ từ lâu hơn?',
  'Cách chơi trò Nghe & Chạm tranh?',
  'Mở khóa tự do tất cả Unit ở đâu?',
  'Khi nào nên dùng mục Thẻ từ?',
  'Cách ba mẹ đồng hành cùng bé?',
];

export type LumoRouteHint = {
  mood: LumoMood;
  tip: string;
  quickPrompts: string[];
};

export function getLumoRouteHint(ctx: LumoContext): LumoRouteHint {
  const { pathname, search } = ctx;
  const params = new URLSearchParams(search);
  const unit = params.get('unit');

  if (pathname.startsWith('/learning') && unit) {
    return {
      mood: 'happy',
      tip: `Đang học Unit ${unit}! Bé nhớ bấm loa nghe thật rõ rồi đọc to theo Lumo nhé!`,
      quickPrompts: [
        'Học Phonics là học gì vậy Lumo?',
        'Làm sao để bé nhớ từ lâu hơn?',
        'Mỗi ngày bé nên học mấy phút?',
      ],
    };
  }

  if (pathname.startsWith('/learning')) {
    return {
      mood: 'happy',
      tip: 'Chào bé! Chọn Unit 1 trên bản đồ hành trình để cùng Lumo săn 3 sao vàng nhé!',
      quickPrompts: [
        'Bé nên bắt đầu từ Unit nào?',
        'Tiếng Anh lớp 1 học những gì?',
        'Mở khóa tự do tất cả Unit ở đâu?',
      ],
    };
  }

  if (pathname.startsWith('/games')) {
    return {
      mood: 'cool',
      tip: 'Chọn 1 trò chơi bên dưới để vừa chơi vui vừa ôn nhanh 64 từ lớp 1 nhé!',
      quickPrompts: [
        'Cách chơi trò Nghe & Chạm tranh?',
        'Học Phonics là học gì vậy Lumo?',
        'Mỗi ngày bé nên học mấy phút?',
      ],
    };
  }

  if (pathname.startsWith('/flashcards')) {
    return {
      mood: 'reading',
      tip: 'Nghe Lumo đọc trước, đoán nghĩa rồi chạm vào thẻ để lật kiểm tra nhé!',
      quickPrompts: [
        'Khi nào nên dùng mục Thẻ từ?',
        'Làm sao để bé nhớ từ lâu hơn?',
        'Cách ba mẹ đồng hành cùng bé?',
      ],
    };
  }

  return {
    mood: 'default',
    tip: 'Chào bé và ba mẹ! Cần hỏi về 16 Unit Tiếng Anh 1 Global Success cứ nhắn Lumo nhé.',
    quickPrompts: [
      'Tiếng Anh lớp 1 học những gì?',
      'Học Phonics là học gì vậy Lumo?',
      'Bé nên bắt đầu từ Unit nào?',
    ],
  };
}

type KnowledgeEntry = {
  pattern: RegExp;
  mood: LumoMood;
  reply: string;
};

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    pattern: /phonics|âm|chữ cái/i,
    mood: 'thinking',
    reply:
      'Phonics là cách học phát âm từng chữ cái tự nhiên như trẻ bản xứ:\n• Học kỳ 1 (Unit 1–8): Bb (/b/), Cc (/k/), Aa (/æ/), Dd (/d/), Ii (/ɪ/), Ee (/e/), Gg (/ɡ/), Hh (/h/).\n• Học kỳ 2 (Unit 9–16): Oo (/ɒ/), Mm (/m/), Uu (/ʌ/), Ll (/l/), Nn (/n/), Tt (/t/), Ff (/f/), Ww (/w/).',
  },
  {
    pattern: /lớp 1|những gì|global success|chương trình/i,
    mood: 'happy',
    reply:
      'Chương trình Tiếng Anh 1 Global Success gồm 16 Unit (64 từ vựng quen thuộc):\n• Học kỳ 1 (Unit 1–8): Sân trường, phòng ăn, chợ phố, phòng ngủ, quán ăn, lớp học, khu vườn, công viên.\n• Học kỳ 2 (Unit 9–16): Cửa hàng, sở thú, trạm xe buýt, bên hồ, căn-tin, tiệm đồ chơi, sân bóng, ở nhà.',
  },
  {
    pattern: /unit 1.*unit 4|mẫu câu.*1|mẫu câu.*4/i,
    mood: 'reading',
    reply:
      'Mẫu câu trọng tâm Unit 1–4:\n• Unit 1: Hi! I have a ball.\n• Unit 2: I have a cat / car / cake.\n• Unit 3: This is my bag / hat / apple.\n• Unit 4: This is a dog / duck / desk.',
  },
  {
    pattern: /unit 5.*unit 8|mẫu câu.*5|mẫu câu.*8/i,
    mood: 'reading',
    reply:
      'Mẫu câu trọng tâm Unit 5–8:\n• Unit 5: I like fish / milk / chicken.\n• Unit 6: It\'s a red pen / pencil.\n• Unit 7: There\'s a garden / goat / gate.\n• Unit 8: Touch your hair / head / hand!',
  },
  {
    pattern: /học kỳ 2|hk2|unit 9|unit 16/i,
    mood: 'cool',
    reply:
      'Học kỳ 2 (Unit 9–16) gồm các chủ đề rất gần gũi: Cửa hàng (clock, mop), Sở thú (monkey, mango), Trạm xe buýt (bus, sun, truck), Bên hồ (lake, leaf, lemon), Căn-tin (banana, noodles), Tiệm đồ chơi (teddy bear, tiger, turtle), Trận bóng đá (football, father) và Ở nhà (water, window).',
  },
  {
    pattern: /bắt đầu|unit nào|mấy phút|bao lâu|ba mẹ|đồng hành/i,
    mood: 'happy',
    reply:
      'Cách học siêu vui cho bé lớp 1 (10–15 phút/ngày):\n1. Học 1 Unit trên Bản đồ Hành trình (Nghe Phonics → Xem 4 từ → Chơi 3 mini-game → Nhận 3 sao vàng).\n2. Đọc to cùng bé và khen ngợi mỗi khi bé chạm đúng tranh.\n3. Cuối tuần vào "Trò chơi" hoặc "Thẻ từ" ôn nhanh 5 phút!',
  },
  {
    pattern: /mở khóa|tự do|tất cả unit/i,
    mood: 'cool',
    reply:
      'Trên màn hình Hành trình, ba mẹ/thầy cô chỉ cần bấm nút "Mở khóa tự do" ở góc phải thanh Học kỳ 1 / Học kỳ 2 là có thể mở ngay bất kỳ Unit nào từ Unit 1 đến Unit 16!',
  },
  {
    pattern: /trò chơi|nghe.*chạm|game/i,
    mood: 'cool',
    reply:
      'Trong mục "Trò chơi" có 3 game tương tác: Nghe & Chạm tranh (luyện phản xạ nghe), Bong bóng Phonics (nhận diện âm chữ cái) và Ghép cặp siêu tốc (luyện trí nhớ hình–từ). Bé có thể chọn ôn riêng HK1, HK2 hoặc cả 16 Unit!',
  },
  {
    pattern: /thẻ từ|flashcard|nhớ lâu/i,
    mood: 'reading',
    reply:
      'Mục "Thẻ từ" nằm riêng trên thanh menu để bé và ba mẹ ôn nhanh từng Unit. Bí quyết nhớ lâu là nghe loa đọc trước → nhìn hình đoán từ → đọc to theo 2 lần rồi mới lật mặt sau!',
  },
];

const LUMO_AI_ENDPOINT: string | null = null;

export async function askLumoTutor(
  question: string,
  context: LumoContext,
): Promise<{ reply: string; mood: LumoMood }> {
  const trimmed = question.trim();
  if (!trimmed) {
    return {
      mood: 'default',
      reply: 'Bé hoặc ba mẹ cứ hỏi Lumo bất kỳ điều gì về 16 Unit Tiếng Anh 1 nhé!',
    };
  }

  if (LUMO_AI_ENDPOINT) {
    try {
      const res = await fetch(LUMO_AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed, context }),
      });
      if (res.ok) {
        const data = (await res.json()) as { reply?: string; mood?: LumoMood };
        if (data.reply) {
          return { reply: data.reply, mood: data.mood ?? 'happy' };
        }
      }
    } catch {
      // Fallback to local knowledge base
    }
  }

  await new Promise((r) => window.setTimeout(r, 200));

  for (const item of KNOWLEDGE_BASE) {
    if (item.pattern.test(trimmed)) {
      return { reply: item.reply, mood: item.mood };
    }
  }

  const routeHint = getLumoRouteHint(context);
  return {
    mood: 'happy',
    reply: `Lumo nghe rồi nè! Gợi ý nhanh cho bé: ${routeHint.tip}\n\nBa mẹ có thể hỏi Lumo về Phonics (Bb–Ww), mẫu câu các Unit 1–16 hoặc cách luyện nghe – trò chơi cho bé nhé!`,
  };
}
