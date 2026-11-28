// Structured 3-Stage Cambridge KET/PET & British Council (A1-B1) Curriculum
// Grammar: Discovery -> Structured Lesson & Common Mistakes -> Scaffolded Practice (MCQ + Error Spotting + Sentence Builder)
// Listening: Pre-Listening (Key Words) -> While-Listening (Gap-Fill + Comprehension) -> Post-Listening (Line-by-Line Shadowing + Golden Phrases)
// Reading: Pre-Reading (Key Glossary) -> Active Reading (Interactive Tap-to-Define) -> Comprehension (True/False + Evidence & MCQ)

export type SkillQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanationVi: string;
};

export type KeyWordItem = {
  word: string;
  ipa: string;
  pos: string;
  meaningVi: string;
};

export type GrammarMistake = {
  wrong: string;
  right: string;
  whyVi: string;
};

export type ErrorSpottingDrill = {
  id: string;
  promptVi: string;
  segments: string[];
  wrongIndex: number;
  correction: string;
  explanationVi: string;
};

export type SentenceBuilderDrill = {
  id: string;
  promptVi: string;
  answerTokens: string[];
  distractorTokens: string[];
  explanationVi: string;
};

export type TopicGrammarUnit = {
  title: string;
  subtitleEn: string;
  cefr: string;
  summaryVi: string;
  discoveryContextVi: string;
  discoveryDialogue: Array<{ speaker: string; lineEn: string; highlight: string; lineVi: string }>;
  discoveryTakeawayVi: string;
  formulas: Array<{ label: string; pattern: string; exampleEn: string; exampleVi: string }>;
  commonMistakes: GrammarMistake[];
  tipVi: string;
  questions: SkillQuestion[];
  errorDrill: ErrorSpottingDrill;
  sentenceBuilder: SentenceBuilderDrill;
};

export type ListeningLine = {
  speaker: string;
  en: string;
  vi: string;
};

export type ListeningGap = {
  id: string;
  before: string;
  after: string;
  answer: string;
  options: string[];
  hintVi: string;
};

export type TopicListeningUnit = {
  title: string;
  subtitleEn: string;
  cefr: string;
  contextVi: string;
  guidingQuestionVi: string;
  preWords: KeyWordItem[];
  dialogue: ListeningLine[];
  gaps: ListeningGap[];
  questions: SkillQuestion[];
  goldenPhrases: Array<{ phrase: string; meaningVi: string; usageVi: string }>;
};

export type ReadingTrueFalse = {
  id: string;
  statement: string;
  isTrue: boolean;
  evidenceEn: string;
  explanationVi: string;
};

export type TopicReadingUnit = {
  title: string;
  subtitleEn: string;
  cefr: string;
  genreLabel: string;
  warmUpVi: string;
  glossary: KeyWordItem[];
  passageEn: string;
  passageVi: string;
  trueFalse: ReadingTrueFalse[];
  questions: SkillQuestion[];
};

export type TopicSkillsPack = {
  grammar: TopicGrammarUnit;
  listening: TopicListeningUnit;
  reading: TopicReadingUnit;
};

const FOOD_SKILLS: TopicSkillsPack = {
  grammar: {
    title: 'Danh từ đếm được & không đếm được · Cách dùng Some / Any',
    subtitleEn: 'Countable & Uncountable Nouns · Some / Any',
    cefr: 'A1–A2',
    summaryVi: 'Phân biệt danh từ đếm được (egg, menu, waiter) và không đếm được (coffee, water, soup) để gọi món và mua sắm tự nhiên.',
    discoveryContextVi: 'Nghe đoạn gọi món ngắn dưới đây và để ý cách nhân vật dùng "some", "any" và "how much":',
    discoveryDialogue: [
      {
        speaker: 'Khách',
        lineEn: 'Excuse me, could we have some cold water and the lunch menu?',
        highlight: 'some cold water',
        lineVi: 'Xin lỗi, cho chúng tôi một ít nước lạnh và thực đơn bữa trưa nhé?',
      },
      {
        speaker: 'Phục vụ',
        lineEn: 'Of course! Do you have any food allergies before you order?',
        highlight: 'any food allergies',
        lineVi: 'Tất nhiên rồi! Anh chị có bị dị ứng thực phẩm nào trước khi gọi món không ạ?',
      },
    ],
    discoveryTakeawayVi: 'Nhận xét: "water" không đếm được nên không thêm "a/an" hay "-s". Dù là câu hỏi, lời đề nghị lịch sự ("Could we have...?") vẫn dùng "some", còn câu hỏi kiểm tra thông tin ("Do you have...?") dùng "any".',
    formulas: [
      {
        label: 'Câu khẳng định & lời mời',
        pattern: 'some + N số nhiều / N không đếm được',
        exampleEn: 'Would you like some fresh coffee or some warm croissants?',
        exampleVi: 'Bạn có muốn một ít cà phê tươi hay vài chiếc bánh sừng bò nóng không?',
      },
      {
        label: 'Câu phủ định & câu hỏi',
        pattern: 'any + N số nhiều / N không đếm được',
        exampleEn: 'Do you have any spicy dishes without peanuts?',
        exampleVi: 'Nhà hàng có món cay nào không chứa đậu phộng không?',
      },
      {
        label: 'Hỏi số lượng',
        pattern: 'How many (đếm được) vs. How much (không đếm được)',
        exampleEn: 'How much is the bill, and how many desserts did we order?',
        exampleVi: 'Hóa đơn hết bao nhiêu tiền, và chúng ta đã gọi mấy món tráng miệng?',
      },
    ],
    commonMistakes: [
      {
        wrong: 'Can I have a water and two coffees please?',
        right: 'Can I have some water (hoặc a glass of water) please?',
        whyVi: '"water" là danh từ không đếm được nên không đi trực tiếp với "a". Muốn đếm hãy dùng đơn vị chứa (a glass/bottle of water) hoặc "some water".',
      },
      {
        wrong: 'How many money is the seafood soup?',
        right: 'How much is the seafood soup?',
        whyVi: '"money" và giá tiền luôn là danh từ không đếm được → bắt buộc dùng "How much".',
      },
    ],
    tipVi: 'Mẹo nhớ nhanh: Đề nghị lịch sự ở nhà hàng ("Would you like...?" / "Could I have...?") → luôn dùng SOME thay vì ANY.',
    questions: [
      {
        id: 'food-g1',
        question: 'Excuse me, could we have ___ water and the lunch menu, please?',
        options: ['some', 'any', 'many', 'a'],
        correctIndex: 0,
        explanationVi: 'Trong câu đề nghị lịch sự ("Could we have...?"), dùng "some" với danh từ không đếm được "water".',
      },
      {
        id: 'food-g2',
        question: 'There aren\'t ___ fresh vegetables left in the fridge for dinner.',
        options: ['some', 'any', 'much', 'an'],
        correctIndex: 1,
        explanationVi: 'Câu phủ định ("aren\'t") với danh từ đếm được số nhiều ("vegetables") → dùng "any".',
      },
    ],
    errorDrill: {
      id: 'food-err1',
      promptVi: 'Chạm vào phần BỊ SAI trong câu gọi món sau:',
      segments: ['We don\'t have', 'some spicy soup', 'on the menu tonight.'],
      wrongIndex: 1,
      correction: 'any spicy soup',
      explanationVi: 'Đây là câu phủ định ("don\'t have"), không phải lời mời lịch sự → phải đổi "some" thành "any".',
    },
    sentenceBuilder: {
      id: 'food-sb1',
      promptVi: 'Ghép thành câu hỏi lịch sự: "Bạn có muốn một ít trà nóng không?"',
      answerTokens: ['Would', 'you', 'like', 'some', 'hot', 'tea?'],
      distractorTokens: ['any', 'a'],
      explanationVi: 'Lời mời lịch sự dùng cấu trúc: Would you like + some + danh từ không đếm được (hot tea).',
    },
  },
  listening: {
    title: 'Nghe hội thoại gọi món tại quán ăn',
    subtitleEn: 'Ordering Lunch at a Local Bistro',
    cefr: 'A1–A2',
    contextVi: 'Một khách hàng đang gọi bữa trưa tại quán ăn địa phương cùng nhân viên phục vụ.',
    guidingQuestionVi: 'Khi nghe lần đầu, hãy chú ý: Khách hàng chọn món chính nào, đồ uống gì và muốn tránh nguyên liệu nào?',
    preWords: [
      { word: 'recommend', ipa: '/ˌrek.əˈmend/', pos: 'v', meaningVi: 'gợi ý, đề xuất' },
      { word: 'spicy', ipa: '/ˈspaɪ.si/', pos: 'adj', meaningVi: 'cay' },
      { word: 'flavor', ipa: '/ˈfleɪ.vər/', pos: 'n', meaningVi: 'hương vị' },
      { word: 'bill', ipa: '/bɪl/', pos: 'n', meaningVi: 'hóa đơn' },
    ],
    dialogue: [
      {
        speaker: 'Waiter',
        en: 'Good afternoon! Welcome to Green Leaf Bistro. Are you ready to order?',
        vi: 'Chào buổi trưa! Chào mừng đến Green Leaf Bistro. Bạn đã sẵn sàng gọi món chưa?',
      },
      {
        speaker: 'Guest',
        en: 'Almost! I am quite hungry today. What do you recommend from the lunch menu?',
        vi: 'Gần rồi ạ! Hôm nay mình khá đói. Bạn gợi ý món gì từ thực đơn trưa?',
      },
      {
        speaker: 'Waiter',
        en: 'Our grilled chicken salad is very fresh, and the seafood soup has a rich flavor.',
        vi: 'Salad gà nướng của quán rất tươi, còn súp hải sản thì hương vị rất đậm đà.',
      },
      {
        speaker: 'Guest',
        en: 'I will take the seafood soup, please, not too spicy. And could I get an iced coffee without sugar?',
        vi: 'Cho mình súp hải sản nhé, đừng cay quá. Và cho mình một ly cà phê đá không đường được không?',
      },
      {
        speaker: 'Waiter',
        en: 'Certainly. Your meal will be ready in ten minutes, and I will bring the bill whenever you are finished.',
        vi: 'Chắc chắn rồi ạ. Bữa ăn sẽ sẵn sàng trong 10 phút, và mình sẽ mang hóa đơn bất cứ khi nào bạn dùng xong.',
      },
    ],
    gaps: [
      {
        id: 'food-gap1',
        before: 'Our grilled chicken salad is very',
        after: ', and the seafood soup has a rich flavor.',
        answer: 'fresh',
        options: ['fresh', 'sweet', 'cold', 'empty'],
        hintVi: 'Tính từ mô tả độ tươi ngon của món salad.',
      },
      {
        id: 'food-gap2',
        before: 'Could I get an iced coffee without',
        after: '?',
        answer: 'sugar',
        options: ['salt', 'sugar', 'milk', 'ice'],
        hintVi: 'Khách muốn cà phê đá không có thành phần này.',
      },
    ],
    questions: [
      {
        id: 'food-l1',
        question: 'What main dish does the customer choose?',
        options: ['Grilled chicken salad', 'Seafood soup', 'Vegetable pasta', 'Croissant and butter'],
        correctIndex: 1,
        explanationVi: 'Khách nói rõ: "I will take the seafood soup, please, not too spicy."',
      },
      {
        id: 'food-l2',
        question: 'How does the customer want their iced coffee?',
        options: ['Extra sweet', 'With warm milk', 'Without sugar', 'With lemon'],
        correctIndex: 2,
        explanationVi: 'Khách yêu cầu: "could I get an iced coffee without sugar?"',
      },
    ],
    goldenPhrases: [
      {
        phrase: 'What do you recommend?',
        meaningVi: 'Bạn gợi ý món nào?',
        usageVi: 'Cực kỳ tự nhiên khi chưa biết chọn món gì ở nhà hàng.',
      },
      {
        phrase: 'I will take the ..., please.',
        meaningVi: 'Cho tôi chọn món ... nhé.',
        usageVi: 'Cách gọi món lịch sự, tự nhiên hơn "I want...".',
      },
      {
        phrase: 'not too spicy / without sugar',
        meaningVi: 'không cay quá / không đường',
        usageVi: 'Cách tùy chỉnh khẩu vị ngắn gọn khi gọi đồ ăn uống.',
      },
    ],
  },
  reading: {
    title: 'Vì sao bữa sáng quan trọng với sinh viên?',
    subtitleEn: 'Why Breakfast Matters for Busy Students',
    cefr: 'A2–B1',
    genreLabel: 'Bài đọc ngắn · Dinh dưỡng học đường',
    warmUpVi: 'Đọc lướt bài viết về thói quen ăn sáng của sinh viên. Chạm vào các từ được tô tím trong bài để tra nghĩa và nghe phát âm ngay lập tức.',
    glossary: [
      { word: 'breakfast', ipa: '/ˈbrek.fəst/', pos: 'n', meaningVi: 'bữa sáng' },
      { word: 'nutrition', ipa: '/njuːˈtrɪʃ.ən/', pos: 'n', meaningVi: 'dinh dưỡng' },
      { word: 'recipe', ipa: '/ˈres.ə.pi/', pos: 'n', meaningVi: 'công thức nấu ăn' },
      { word: 'fresh', ipa: '/freʃ/', pos: 'adj', meaningVi: 'tươi mới' },
      { word: 'bakery', ipa: '/ˈbeɪ.kər.i/', pos: 'n', meaningVi: 'tiệm bánh' },
      { word: 'delicious', ipa: '/dɪˈlɪʃ.əs/', pos: 'adj', meaningVi: 'ngon miệng' },
    ],
    passageEn:
      'Many university students skip breakfast because they wake up late and rush to class. However, starting the day with only a cup of coffee often leads to low energy before noon. Good morning nutrition does not need a complicated recipe. Even ten minutes is enough to prepare fresh fruit, yogurt, or whole-grain toast from a neighborhood bakery. When you eat a balanced and delicious first meal, your brain stays focused longer during lectures.',
    passageVi:
      'Nhiều sinh viên đại học bỏ bữa sáng vì dậy muộn và vội đến lớp. Tuy nhiên, bắt đầu ngày mới chỉ với một tách cà phê thường khiến cơ thể tụt năng lượng trước buổi trưa. Dinh dưỡng buổi sáng tốt không cần một công thức nấu ăn phức tạp. Chỉ cần 10 phút là đủ để chuẩn bị trái cây tươi, sữa chua hoặc bánh mì nguyên cám từ tiệm bánh gần nhà. Khi bạn ăn một bữa đầu ngày cân bằng và ngon miệng, não bộ sẽ duy trì sự tập trung lâu hơn trong giờ giảng.',
    trueFalse: [
      {
        id: 'food-tf1',
        statement: 'You need a complicated recipe to have good morning nutrition.',
        isTrue: false,
        evidenceEn: 'Good morning nutrition does not need a complicated recipe.',
        explanationVi: 'Sai (False). Bài đọc khẳng định rõ dinh dưỡng buổi sáng không cần công thức phức tạp.',
      },
      {
        id: 'food-tf2',
        statement: 'A balanced breakfast helps students concentrate longer in lectures.',
        isTrue: true,
        evidenceEn: 'When you eat a balanced and delicious first meal, your brain stays focused longer during lectures.',
        explanationVi: 'Đúng (True). Câu cuối xác nhận bữa sáng cân bằng giúp não tập trung lâu hơn.',
      },
    ],
    questions: [
      {
        id: 'food-r1',
        question: 'What happens when students only drink coffee in the morning?',
        options: [
          'They stay focused all afternoon',
          'They often have low energy before noon',
          'They save time at the bakery',
          'They feel too full for lunch',
        ],
        correctIndex: 1,
        explanationVi: 'Câu 2 nêu rõ: "starting the day with only a cup of coffee often leads to low energy before noon."',
      },
      {
        id: 'food-r2',
        question: 'How long does the article say is enough to prepare a simple breakfast?',
        options: ['Two minutes', 'Ten minutes', 'Thirty minutes', 'One hour'],
        correctIndex: 1,
        explanationVi: 'Bài viết ghi rõ: "Even ten minutes is enough to prepare fresh fruit, yogurt, or whole-grain toast."',
      },
    ],
  },
};

const HOME_SKILLS: TopicSkillsPack = {
  grammar: {
    title: 'Miêu tả không gian với There is / There are & Giới từ vị trí',
    subtitleEn: 'There is / There are & Prepositions of Place',
    cefr: 'A1–A2',
    summaryVi: 'Mô tả căn phòng, vị trí đồ đạc và không gian sống bằng "There is/are" kết hợp giới từ chỉ nơi chốn (in, on, next to, between).',
    discoveryContextVi: 'Đọc đoạn giới thiệu căn hộ mới và để ý cách dùng "There is / There are" cùng giới từ:',
    discoveryDialogue: [
      {
        speaker: 'Minh',
        lineEn: 'There is a bright desk next to the balcony, so I love studying there.',
        highlight: 'There is a bright desk next to',
        lineVi: 'Có một chiếc bàn học sáng sủa ngay cạnh ban công, nên mình rất thích học ở đó.',
      },
      {
        speaker: 'Lan',
        lineEn: 'Nice! Are there any quiet cafés between your apartment and the station?',
        highlight: 'Are there any quiet cafés between',
        lineVi: 'Tuyệt thế! Có quán cà phê yên tĩnh nào nằm giữa căn hộ của bạn và nhà ga không?',
      },
    ],
    discoveryTakeawayVi: 'Nhận xét: Dùng "There is" cho 1 đồ vật (a bright desk), dùng "There are / Are there" cho số nhiều (quiet cafés). Muốn nói vị trí giữa 2 vật, luôn dùng "between A and B".',
    formulas: [
      {
        label: 'Số ít & Không đếm được',
        pattern: 'There is (There\'s) + a/an + N số ít',
        exampleEn: 'There is a wooden table in the center of the kitchen.',
        exampleVi: 'Có một chiếc bàn gỗ ở giữa nhà bếp.',
      },
      {
        label: 'Số nhiều',
        pattern: 'There are + (some/two/many) + N số nhiều',
        exampleEn: 'There are two cozy armchairs next to the bright window.',
        exampleVi: 'Có hai chiếc ghế bành ấm cúng ngay cạnh cửa sổ sáng.',
      },
      {
        label: 'Giới từ vị trí chuẩn',
        pattern: 'next to · opposite · between A and B',
        exampleEn: 'The sofa stands between the lamp and the bookshelf.',
        exampleVi: 'Chiếc ghế sofa nằm giữa đèn bàn và kệ sách.',
      },
    ],
    commonMistakes: [
      {
        wrong: 'My bedroom have a big window and two pillows.',
        right: 'There is a big window in my bedroom. (hoặc My bedroom has...)',
        whyVi: 'Chủ ngữ số ít "My bedroom" không đi với "have". Khi miêu tả không gian, người bản xứ ưu tiên "There is / There are".',
      },
      {
        wrong: 'There is many books on the wooden shelf.',
        right: 'There are many books on the wooden shelf.',
        whyVi: '"books" là số nhiều → bắt buộc chia "There are", không dùng "There is".',
      },
    ],
    tipVi: 'Mẹo nhanh: Khi liệt kê nhiều món đồ, động từ chia theo món đầu tiên ngay sau nó: "There IS a sofa and two chairs" (nhưng "There ARE two chairs and a sofa").',
    questions: [
      {
        id: 'home-g1',
        question: '___ a quiet balcony overlooking the park in her new apartment.',
        options: ['There is', 'There are', 'They are', 'It have'],
        correctIndex: 0,
        explanationVi: '"a quiet balcony" là danh từ số ít → dùng "There is".',
      },
      {
        id: 'home-g2',
        question: 'The washing machine is located ___ the kitchen and the bathroom.',
        options: ['on', 'between', 'under', 'at'],
        correctIndex: 1,
        explanationVi: 'Đứng giữa hai địa điểm ("A and B") → dùng giới từ "between".',
      },
    ],
    errorDrill: {
      id: 'home-err1',
      promptVi: 'Chạm vào phần BỊ SAI trong câu miêu tả phòng sau:',
      segments: ['There is', 'three clean towels', 'inside the bathroom cabinet.'],
      wrongIndex: 0,
      correction: 'There are',
      explanationVi: '"three clean towels" là danh từ số nhiều → phải dùng "There are".',
    },
    sentenceBuilder: {
      id: 'home-sb1',
      promptVi: 'Ghép thành câu hoàn chỉnh: "Có một chiếc gương lớn cạnh cửa ra vào."',
      answerTokens: ['There', 'is', 'a', 'large', 'mirror', 'next to', 'the door.'],
      distractorTokens: ['are', 'between'],
      explanationVi: 'Cấu trúc: There is + a large mirror + next to + the door.',
    },
  },
  listening: {
    title: 'Nghe dẫn bạn tham quan căn hộ mới',
    subtitleEn: 'Showing a Friend Around a New Apartment',
    cefr: 'A1–A2',
    contextVi: 'Minh đang dẫn bạn tham quan căn hộ mới thuê gần công viên.',
    guidingQuestionVi: 'Khi nghe, hãy chú ý: Căn hộ nằm ở tầng mấy và góc yêu thích nhất của chủ nhà là ở đâu?',
    preWords: [
      { word: 'apartment', ipa: '/əˈpɑːrt.mənt/', pos: 'n', meaningVi: 'căn hộ' },
      { word: 'balcony', ipa: '/ˈbæl.kə.ni/', pos: 'n', meaningVi: 'ban công' },
      { word: 'furniture', ipa: '/ˈfɜːr.nɪ.tʃər/', pos: 'n', meaningVi: 'đồ nội thất' },
      { word: 'cozy', ipa: '/ˈkoʊ.zi/', pos: 'adj', meaningVi: 'ấm cúng' },
    ],
    dialogue: [
      {
        speaker: 'Host',
        en: 'Welcome to my new apartment! Come on in and take a look around.',
        vi: 'Chào mừng đến căn hộ mới của mình! Vào xem quanh một vòng đi.',
      },
      {
        speaker: 'Friend',
        en: 'Wow, the living room feels so cozy and bright. Which floor are we on?',
        vi: 'Ồ, phòng khách cảm giác ấm cúng và sáng quá. Chúng ta đang ở tầng mấy thế?',
      },
      {
        speaker: 'Host',
        en: 'We are on the fourth floor, right next to the elevator. The kitchen has modern furniture and a big fridge.',
        vi: 'Mình ở tầng bốn, ngay cạnh thang máy. Bếp có nội thất hiện đại và một chiếc tủ lạnh lớn.',
      },
      {
        speaker: 'Friend',
        en: 'What is your favorite spot in the whole place?',
        vi: 'Góc yêu thích nhất của bạn trong cả căn nhà là chỗ nào?',
      },
      {
        speaker: 'Host',
        en: 'Definitely the balcony! I keep two plants there and drink morning tea while watching the sunrise.',
        vi: 'Chắc chắn là ban công rồi! Mình đặt hai chậu cây ở đó và uống trà sáng lúc ngắm bình minh.',
      },
    ],
    gaps: [
      {
        id: 'home-gap1',
        before: 'We are on the fourth floor, right next to the',
        after: '.',
        answer: 'elevator',
        options: ['elevator', 'garden', 'garage', 'roof'],
        hintVi: 'Phương tiện đi lên các tầng trong chung cư.',
      },
      {
        id: 'home-gap2',
        before: 'I keep two plants on the',
        after: 'and drink morning tea.',
        answer: 'balcony',
        options: ['bedroom', 'balcony', 'hallway', 'kitchen'],
        hintVi: 'Khoảng không gian ngoài trời của căn hộ.',
      },
    ],
    questions: [
      {
        id: 'home-l1',
        question: 'Which floor is the new apartment on?',
        options: ['The second floor', 'The third floor', 'The fourth floor', 'The fifth floor'],
        correctIndex: 2,
        explanationVi: 'Chủ nhà nói rõ: "We are on the fourth floor, right next to the elevator."',
      },
      {
        id: 'home-l2',
        question: 'What is the host\'s favorite spot in the apartment?',
        options: ['The kitchen', 'The balcony', 'The hallway', 'The bedroom'],
        correctIndex: 1,
        explanationVi: 'Chủ nhà trả lời: "Definitely the balcony!"',
      },
    ],
    goldenPhrases: [
      {
        phrase: 'Come on in and take a look around.',
        meaningVi: 'Vào nhà đi và xem quanh một vòng nhé.',
        usageVi: 'Câu mời khách vào nhà cực kỳ thân thiện, tự nhiên.',
      },
      {
        phrase: 'right next to ...',
        meaningVi: 'ngay sát bên cạnh ...',
        usageVi: 'Thêm "right" trước giới từ để nhấn mạnh vị trí rất gần.',
      },
      {
        phrase: 'Definitely ...!',
        meaningVi: 'Chắc chắn là ... rồi!',
        usageVi: 'Cách trả lời đầy hào hứng khi nhấn mạnh lựa chọn yêu thích.',
      },
    ],
  },
  reading: {
    title: 'Căn phòng gọn gàng giúp bạn tập trung thế nào?',
    subtitleEn: 'How a Tidy Room Improves Your Focus',
    cefr: 'A2',
    genreLabel: 'Bài đọc ngắn · Phong cách sống',
    warmUpVi: 'Đọc bài viết về tác động của một căn phòng gọn gàng lên khả năng tập trung. Chạm từ tô tím để tra nghĩa ngay.',
    glossary: [
      { word: 'tidy', ipa: '/ˈtaɪ.di/', pos: 'adj', meaningVi: 'gọn gàng, ngăn nắp' },
      { word: 'furniture', ipa: '/ˈfɜːr.nɪ.tʃər/', pos: 'n', meaningVi: 'đồ nội thất' },
      { word: 'laundry', ipa: '/ˈlɔːn.dri/', pos: 'n', meaningVi: 'quần áo giặt ủi' },
      { word: 'curtain', ipa: '/ˈkɜːr.tən/', pos: 'n', meaningVi: 'rèm cửa' },
      { word: 'routine', ipa: '/ruːˈtiːn/', pos: 'n', meaningVi: 'thói quen hằng ngày' },
    ],
    passageEn:
      'Your bedroom is more than just a place to sleep. Psychologists notice that clutter around your desk makes it harder to concentrate. Keeping your space tidy takes only five minutes each evening. Put dirty clothes in the laundry basket, fold your blanket, and arrange simple furniture so natural light flows through the curtain every morning. A calm home routine helps you relax faster after a long day.',
    passageVi:
      'Phòng ngủ của bạn không chỉ là nơi để ngủ. Các nhà tâm lý nhận thấy đồ đạc bừa bộn quanh bàn học khiến bạn khó tập trung hơn. Giữ không gian ngăn nắp chỉ tốn 5 phút mỗi tối. Hãy bỏ quần áo bẩn vào giỏ giặt, gấp chăn và sắp xếp nội thất tối giản để ánh sáng tự nhiên tràn qua rèm cửa mỗi sáng. Một thói quen chăm chút nhà cửa êm dịu giúp bạn thư giãn nhanh hơn sau ngày dài.',
    trueFalse: [
      {
        id: 'home-tf1',
        statement: 'Tidying your bedroom requires at least thirty minutes every evening.',
        isTrue: false,
        evidenceEn: 'Keeping your space tidy takes only five minutes each evening.',
        explanationVi: 'Sai (False). Bài viết chỉ ra chỉ cần 5 phút mỗi tối.',
      },
      {
        id: 'home-tf2',
        statement: 'A cluttered desk can make it more difficult to focus.',
        isTrue: true,
        evidenceEn: 'Psychologists notice that clutter around your desk makes it harder to concentrate.',
        explanationVi: 'Đúng (True). Đồ bừa bộn quanh bàn làm giảm sự tập trung.',
      },
    ],
    questions: [
      {
        id: 'home-r1',
        question: 'Where should you put dirty clothes according to the passage?',
        options: ['Under the bed', 'In the laundry basket', 'On the desk', 'Behind the curtain'],
        correctIndex: 1,
        explanationVi: 'Bài đọc hướng dẫn: "Put dirty clothes in the laundry basket."',
      },
      {
        id: 'home-r2',
        question: 'Why should you arrange simple furniture near the window?',
        options: [
          'To hide the curtain',
          'So natural light flows in every morning',
          'To buy more blankets',
          'To sleep longer at noon',
        ],
        correctIndex: 1,
        explanationVi: 'Câu 4 giải thích: "arrange simple furniture so natural light flows through the curtain every morning."',
      },
    ],
  },
};

const TRAVEL_SKILLS: TopicSkillsPack = {
  grammar: {
    title: 'Nói kế hoạch tương lai: Be going to hay Hiện tại tiếp diễn?',
    subtitleEn: 'Future Plans: Be going to vs. Present Continuous',
    cefr: 'A2',
    summaryVi: 'Dùng "be going to" cho dự định du lịch và Hiện tại tiếp diễn cho lịch trình đã đặt vé/khách sạn chắc chắn.',
    discoveryContextVi: 'Xem hai câu trò chuyện trước chuyến đi Đà Nẵng và nhận ra sự khác biệt về độ chắc chắn:',
    discoveryDialogue: [
      {
        speaker: 'An',
        lineEn: 'We are flying to Da Nang at 7 AM tomorrow — I already printed our boarding passes.',
        highlight: 'are flying to Da Nang at 7 AM',
        lineVi: 'Ngày mai 7 giờ sáng tụi mình bay đi Đà Nẵng — mình in sẵn thẻ lên máy bay rồi.',
      },
      {
        speaker: 'Vy',
        lineEn: 'Awesome! I am going to explore the night market once we check in.',
        highlight: 'am going to explore',
        lineVi: 'Tuyệt quá! Tụi mình dự định đi khám phá chợ đêm ngay sau khi nhận phòng.',
      },
    ],
    discoveryTakeawayVi: 'Nhận xét: Đã mua vé, có giờ bay cụ thể (7 AM tomorrow) → dùng Present Continuous ("are flying"). Mới là dự định, chưa chốt giờ cố định → dùng "be going to" ("am going to explore").',
    formulas: [
      {
        label: 'Dự định (Intention)',
        pattern: 'S + am/is/are + going to + V nguyên mẫu',
        exampleEn: 'We are going to visit the coastal museum this weekend.',
        exampleVi: 'Chúng tôi dự định ghé thăm bảo tàng ven biển cuối tuần này.',
      },
      {
        label: 'Lịch trình đã chốt (Arrangement)',
        pattern: 'S + am/is/are + V-ing + mốc thời gian',
        exampleEn: 'Our train is leaving from platform four at 8:30 AM.',
        exampleVi: 'Chuyến tàu của chúng ta sẽ rời sân ga số 4 lúc 8:30 sáng.',
      },
      {
        label: 'Hỏi đường lịch sự',
        pattern: 'Could you tell me how to get to ...?',
        exampleEn: 'Could you tell me how to get to the nearest subway station?',
        exampleVi: 'Bạn có thể chỉ tôi đường đến ga tàu điện ngầm gần nhất không?',
      },
    ],
    commonMistakes: [
      {
        wrong: 'I going to book a hotel room tonight.',
        right: 'I am going to book a hotel room tonight.',
        whyVi: 'Người Việt hay quên động từ "to be" (am/is/are) trước "going to". Bắt buộc phải có "am/is/are".',
      },
      {
        wrong: 'Could you tell me where is the ticket counter?',
        right: 'Could you tell me where the ticket counter is?',
        whyVi: 'Trong câu hỏi gián tiếp ("Could you tell me..."), không đảo trợ động từ — giữ trật tự xuôi S + V.',
      },
    ],
    tipVi: 'Mẹo nhanh: Đã có vé máy bay, đặt phòng, hoặc giờ hẹn rõ ràng → dùng V-ing (Present Continuous) nghe sẽ chuẩn bản xứ nhất.',
    questions: [
      {
        id: 'travel-g1',
        question: 'Look at my boarding pass! My flight ___ at 9:15 AM tomorrow.',
        options: ['is departing', 'departed', 'going to depart', 'depart'],
        correctIndex: 0,
        explanationVi: 'Lịch bay đã chốt chắc chắn có vé và giờ cụ thể → dùng Hiện tại tiếp diễn "is departing".',
      },
      {
        id: 'travel-g2',
        question: 'Excuse me, could you tell me how ___ to the central train station?',
        options: ['do I get', 'to get', 'getting', 'got'],
        correctIndex: 1,
        explanationVi: 'Cấu trúc hỏi đường chuẩn: "Could you tell me how to get to + địa điểm?"',
      },
    ],
    errorDrill: {
      id: 'travel-err1',
      promptVi: 'Chạm vào phần BỊ SAI trong câu dự định du lịch sau:',
      segments: ['My parents', 'going to stay', 'at a seaside resort next month.'],
      wrongIndex: 1,
      correction: 'are going to stay',
      explanationVi: 'Thiếu động từ to be "are" trước "going to" cho chủ ngữ số nhiều "My parents".',
    },
    sentenceBuilder: {
      id: 'travel-sb1',
      promptVi: 'Ghép câu hỏi đường chuẩn: "Bạn có thể chỉ tôi đường đến bảo tàng không?"',
      answerTokens: ['Could', 'you', 'tell', 'me', 'how', 'to get', 'to the museum?'],
      distractorTokens: ['do', 'getting'],
      explanationVi: 'Cấu trúc lịch sự: Could you tell me + how to get to + địa điểm?',
    },
  },
  listening: {
    title: 'Nghe làm thủ tục check-in tại sân bay',
    subtitleEn: 'Checking In at the Airport Counter',
    cefr: 'A2',
    contextVi: 'Hành khách đang làm thủ tục check-in gửi hành lý và nhận thẻ lên máy bay tại sân bay.',
    guidingQuestionVi: 'Khi nghe, hãy chú ý: Hành khách chọn ghế ngồi ở đâu và cửa ra máy bay (gate) là số mấy?',
    preWords: [
      { word: 'passport', ipa: '/ˈpɑːs.pɔːrt/', pos: 'n', meaningVi: 'hộ chiếu' },
      { word: 'luggage', ipa: '/ˈlʌɡ.ɪdʒ/', pos: 'n', meaningVi: 'hành lý' },
      { word: 'window seat', ipa: '/ˈwɪn.doʊ siːt/', pos: 'n', meaningVi: 'ghế cạnh cửa sổ' },
      { word: 'boarding pass', ipa: '/ˈbɔːr.dɪŋ pɑːs/', pos: 'n', meaningVi: 'thẻ lên máy bay' },
    ],
    dialogue: [
      {
        speaker: 'Staff',
        en: 'Good morning! May I see your passport and flight booking, please?',
        vi: 'Chào buổi sáng! Cho tôi xem hộ chiếu và mã đặt chỗ chuyến bay của bạn nhé?',
      },
      {
        speaker: 'Traveler',
        en: 'Here you go. I have one checked suitcase and a small backpack.',
        vi: 'Của bạn đây. Mình có một vali ký gửi và một ba lô nhỏ.',
      },
      {
        speaker: 'Staff',
        en: 'Thank you. Your luggage is under the weight limit. Would you prefer a window seat or an aisle seat?',
        vi: 'Cảm ơn bạn. Hành lý của bạn trong mức cho phép. Bạn thích ghế cửa sổ hay ghế lối đi?',
      },
      {
        speaker: 'Traveler',
        en: 'A window seat, please, if one is still available.',
        vi: 'Cho mình ghế cửa sổ nhé, nếu vẫn còn chỗ.',
      },
      {
        speaker: 'Staff',
        en: 'Done! Here is your boarding pass. Boarding starts at Gate 12 in forty-five minutes.',
        vi: 'Xong rồi ạ! Đây là thẻ lên máy bay của bạn. Cửa 12 sẽ bắt đầu lên máy bay sau 45 phút nữa.',
      },
    ],
    gaps: [
      {
        id: 'travel-gap1',
        before: 'Your luggage is under the',
        after: 'limit.',
        answer: 'weight',
        options: ['weight', 'speed', 'price', 'height'],
        hintVi: 'Giới hạn cân nặng hành lý ký gửi.',
      },
      {
        id: 'travel-gap2',
        before: 'Boarding starts at',
        after: '12 in forty-five minutes.',
        answer: 'Gate',
        options: ['Platform', 'Gate', 'Floor', 'Room'],
        hintVi: 'Cửa ra máy bay tại sân bay.',
      },
    ],
    questions: [
      {
        id: 'travel-l1',
        question: 'Which seat does the traveler choose?',
        options: ['An aisle seat', 'A middle seat', 'A window seat', 'A front row seat'],
        correctIndex: 2,
        explanationVi: 'Hành khách trả lời: "A window seat, please, if one is still available."',
      },
      {
        id: 'travel-l2',
        question: 'Where and when does boarding start?',
        options: ['Gate 12 in 45 minutes', 'Gate 4 in 15 minutes', 'Gate 20 in 1 hour', 'Gate 12 in 10 minutes'],
        correctIndex: 0,
        explanationVi: 'Nhân viên thông báo: "Boarding starts at Gate 12 in forty-five minutes."',
      },
    ],
    goldenPhrases: [
      {
        phrase: 'May I see your passport, please?',
        meaningVi: 'Cho tôi xem hộ chiếu của bạn nhé?',
        usageVi: 'Câu hỏi cực chuẩn hay nghe ở sân bay và khách sạn.',
      },
      {
        phrase: 'Here you go.',
        meaningVi: 'Của bạn đây.',
        usageVi: 'Nói gọn, tự nhiên khi đưa giấy tờ hoặc vật gì cho người khác.',
      },
      {
        phrase: 'if one is still available',
        meaningVi: 'nếu vẫn còn chỗ/còn sẵn',
        usageVi: 'Cụm bổ sung lịch sự khi yêu cầu đổi ghế hoặc đặt phòng.',
      },
    ],
  },
  reading: {
    title: 'Mẹo đóng gói hành lý gọn cho chuyến đi 5 ngày',
    subtitleEn: 'Packing Smart for a Five-Day City Trip',
    cefr: 'A2–B1',
    genreLabel: 'Cẩm nang du lịch · Kỹ năng đóng gói',
    warmUpVi: 'Đọc mẹo đóng gói hành lý gọn nhẹ cho chuyến đi 5 ngày. Chạm từ tô tím để tra nghĩa ngay trong bài.',
    glossary: [
      { word: 'luggage', ipa: '/ˈlʌɡ.ɪdʒ/', pos: 'n', meaningVi: 'hành lý' },
      { word: 'itinerary', ipa: '/aɪˈtɪn.ə.rer.i/', pos: 'n', meaningVi: 'lịch trình chuyến đi' },
      { word: 'passport', ipa: '/ˈpɑːs.pɔːrt/', pos: 'n', meaningVi: 'hộ chiếu' },
      { word: 'subway', ipa: '/ˈsʌb.weɪ/', pos: 'n', meaningVi: 'tàu điện ngầm' },
      { word: 'souvenir', ipa: '/ˌsuː.vəˈnɪr/', pos: 'n', meaningVi: 'quà lưu niệm' },
    ],
    passageEn:
      'Carrying heavy luggage can turn an exciting holiday into a tiring workout. Before packing, check the weather forecast and review your daily itinerary. Roll your T-shirts instead of folding them to save space inside your backpack. Always keep your passport, charger, and offline city map in a small front pocket so you can move quickly through the subway. Leave a little extra room at the top for a local souvenir on your way home.',
    passageVi:
      'Mang theo hành lý nặng có thể biến một kỳ nghỉ thú vị thành buổi tập thể lực mệt mỏi. Trước khi xếp đồ, hãy xem dự báo thời tiết và rà lại lịch trình hằng ngày. Cuộn tròn áo phông thay vì gấp để tiết kiệm diện tích trong ba lô. Luôn để hộ chiếu, sạc điện thoại và bản đồ thành phố ngoại tuyến ở ngăn nhỏ phía trước để di chuyển nhanh qua tàu điện ngầm. Hãy chừa một chút khoảng trống phía trên cho món quà lưu niệm địa phương trên đường về.',
    trueFalse: [
      {
        id: 'travel-tf1',
        statement: 'Rolling your T-shirts helps save more space than folding them.',
        isTrue: true,
        evidenceEn: 'Roll your T-shirts instead of folding them to save space inside your backpack.',
        explanationVi: 'Đúng (True). Bài viết khuyên cuộn áo thay vì gấp để tiết kiệm diện tích.',
      },
      {
        id: 'travel-tf2',
        statement: 'You should pack your passport at the very bottom of your suitcase.',
        isTrue: false,
        evidenceEn: 'Always keep your passport, charger, and offline city map in a small front pocket.',
        explanationVi: 'Sai (False). Nên để hộ chiếu ở ngăn nhỏ phía trước để tiện lấy nhanh.',
      },
    ],
    questions: [
      {
        id: 'travel-r1',
        question: 'What should you check before you start packing?',
        options: [
          'Only souvenir prices',
          'The weather forecast and your daily itinerary',
          'The hotel breakfast menu',
          'Airline seat maps',
        ],
        correctIndex: 1,
        explanationVi: 'Câu 2 nêu rõ: "Before packing, check the weather forecast and review your daily itinerary."',
      },
      {
        id: 'travel-r2',
        question: 'Why does the writer suggest leaving extra room at the top of your bag?',
        options: ['For extra shoes', 'For a local souvenir', 'For an umbrella', 'For bottled water'],
        correctIndex: 1,
        explanationVi: 'Câu cuối: "Leave a little extra room at the top for a local souvenir on your way home."',
      },
    ],
  },
};

const WORK_SKILLS: TopicSkillsPack = {
  grammar: {
    title: 'Thì Hiện tại hoàn thành (Have / Has + V3) với Already & Yet',
    subtitleEn: 'Present Perfect for Experience & Progress',
    cefr: 'A2–B1',
    summaryVi: 'Dùng Hiện tại hoàn thành để nói về kinh nghiệm trên CV, dự án đã hoàn thành hoặc tiến độ công việc trước deadline.',
    discoveryContextVi: 'Nghe đoạn trao đổi tiến độ nhóm và chú ý sự khác nhau giữa "already" và "yet":',
    discoveryDialogue: [
      {
        speaker: 'Leader',
        lineEn: 'Have you submitted the final slides for tomorrow\'s presentation yet?',
        highlight: 'Have you submitted ... yet?',
        lineVi: 'Bạn đã nộp slide cuối cho buổi thuyết trình ngày mai chưa?',
      },
      {
        speaker: 'Member',
        lineEn: 'Yes! I have already uploaded them and shared the link with our manager.',
        highlight: 'have already uploaded',
        lineVi: 'Rồi ạ! Mình đã tải lên rồi và chia sẻ link với quản lý luôn rồi.',
      },
    ],
    discoveryTakeawayVi: 'Nhận xét: Dùng "Have/Has + V3/ed" khi nhấn mạnh việc ĐÃ XONG hay CHƯA XONG tính đến lúc này. "already" nằm trong câu khẳng định, còn "yet" nằm cuối câu hỏi và câu phủ định.',
    formulas: [
      {
        label: 'Kinh nghiệm & Thành tựu',
        pattern: 'S + have / has + V3/ed',
        exampleEn: 'She has completed two summer internships and earned an English certificate.',
        exampleVi: 'Cô ấy đã hoàn thành hai kỳ thực tập mùa hè và đạt chứng chỉ tiếng Anh.',
      },
      {
        label: 'Đã xong (already)',
        pattern: 'S + have/has + already + V3/ed',
        exampleEn: 'Our team has already tested the new feature before the deadline.',
        exampleVi: 'Nhóm chúng tôi đã kiểm thử tính năng mới trước hạn chót rồi.',
      },
      {
        label: 'Chưa xong / Hỏi tiến độ (yet)',
        pattern: 'Have/Has + S + V3/ed ... yet?',
        exampleEn: 'I haven\'t received feedback from the interviewer yet.',
        exampleVi: 'Tôi vẫn chưa nhận được phản hồi từ người phỏng vấn.',
      },
    ],
    commonMistakes: [
      {
        wrong: 'I have graduated from university in 2024.',
        right: 'I graduated from university in 2024.',
        whyVi: 'Có mốc thời gian quá khứ cụ thể ("in 2024", "yesterday", "last week") → BẮT BUỘC dùng Quá khứ đơn, không dùng Hiện tại hoàn thành.',
      },
      {
        wrong: 'Did you finish the report yet? / I didn\'t send it already.',
        right: 'Have you finished the report yet? / I haven\'t sent it yet.',
        whyVi: 'Trong câu phủ định để nói "chưa làm", luôn dùng "yet" (không dùng "already").',
      },
    ],
    tipVi: 'Mẹo nhanh: Mốc quá khứ rõ ràng ("in 2024", "yesterday") → Quá khứ đơn. Nhấn mạnh kết quả đến hiện tại ("already", "yet", "ever") → Hiện tại hoàn thành.',
    questions: [
      {
        id: 'work-g1',
        question: 'Our team ___ the slides for tomorrow\'s presentation already.',
        options: ['has finished', 'finished yet', 'is finish', 'have finish'],
        correctIndex: 0,
        explanationVi: '"Our team" (số ít) + "already" → Hiện tại hoàn thành "has finished".',
      },
      {
        id: 'work-g2',
        question: 'Have you received any feedback from your manager ___?',
        options: ['already', 'yet', 'ago', 'yesterday'],
        correctIndex: 1,
        explanationVi: 'Trong câu hỏi Hiện tại hoàn thành hỏi "đã ... chưa?", luôn dùng "yet" ở cuối câu.',
      },
    ],
    errorDrill: {
      id: 'work-err1',
      promptVi: 'Chạm vào phần BỊ SAI trong câu nói về kinh nghiệm CV sau:',
      segments: ['She has joined', 'a software internship', 'last summer.'],
      wrongIndex: 0,
      correction: 'She joined',
      explanationVi: 'Vì có mốc quá khứ xác định "last summer", phải dùng Quá khứ đơn "She joined" thay vì "has joined".',
    },
    sentenceBuilder: {
      id: 'work-sb1',
      promptVi: 'Ghép thành câu hoàn chỉnh: "Tôi đã gửi CV cho công ty rồi."',
      answerTokens: ['I', 'have', 'already', 'sent', 'my', 'resume', 'to the company.'],
      distractorTokens: ['yet', 'send'],
      explanationVi: 'Cấu trúc Hiện tại hoàn thành khẳng định: I + have + already + sent (V3) + tân ngữ.',
    },
  },
  listening: {
    title: 'Nghe lời khuyên trước buổi phỏng vấn thực tập',
    subtitleEn: 'Preparing for a Tech Internship Interview',
    cefr: 'A2–B1',
    contextVi: 'Một anh mentor khóa trên chia sẻ lời khuyên thực tế cho sinh viên trước buổi phỏng vấn thực tập.',
    guidingQuestionVi: 'Khi nghe, hãy chú ý: Sinh viên cần chuẩn bị giải thích điều gì và nên hỏi nhà tuyển dụng câu gì?',
    preWords: [
      { word: 'internship', ipa: '/ˈɪn.tɜːrn.ʃɪp/', pos: 'n', meaningVi: 'kỳ thực tập' },
      { word: 'resume', ipa: '/ˈrez.ə.meɪ/', pos: 'n', meaningVi: 'sơ yếu lý lịch (CV)' },
      { word: 'feedback', ipa: '/ˈfiːd.bæk/', pos: 'n', meaningVi: 'phản hồi, góp ý' },
      { word: 'colleague', ipa: '/ˈkɑː.liːɡ/', pos: 'n', meaningVi: 'đồng nghiệp' },
    ],
    dialogue: [
      {
        speaker: 'Mentor',
        en: 'Congratulations on getting an interview for the summer internship!',
        vi: 'Chúc mừng bạn đã nhận được lịch phỏng vấn cho kỳ thực tập mùa hè nhé!',
      },
      {
        speaker: 'Student',
        en: 'Thanks! I am a little nervous. How should I prepare before Monday?',
        vi: 'Cảm ơn anh! Em hơi hồi hộp. Em nên chuẩn bị gì trước thứ Hai ạ?',
      },
      {
        speaker: 'Mentor',
        en: 'Review your resume carefully and be ready to explain one university project you are proud of.',
        vi: 'Hãy xem kỹ lại CV và sẵn sàng giải thích một đồ án đại học mà em tự hào nhất.',
      },
      {
        speaker: 'Student',
        en: 'Should I bring my laptop to show a live demo?',
        vi: 'Em có nên mang laptop để chạy demo trực tiếp không ạ?',
      },
      {
        speaker: 'Mentor',
        en: 'Yes, bring a clean notebook and your laptop. During the meeting, listen closely to feedback and ask how colleagues collaborate every day.',
        vi: 'Có chứ, mang theo sổ tay gọn gàng và laptop. Trong buổi gặp, hãy lắng nghe kỹ phản hồi và hỏi cách các đồng nghiệp cộng tác mỗi ngày.',
      },
    ],
    gaps: [
      {
        id: 'work-gap1',
        before: 'Review your',
        after: 'carefully and be ready to explain one university project.',
        answer: 'resume',
        options: ['resume', 'receipt', 'passport', 'menu'],
        hintVi: 'Tài liệu tóm tắt học vấn và kinh nghiệm ứng tuyển.',
      },
      {
        id: 'work-gap2',
        before: 'Ask thoughtful questions about how',
        after: 'collaborate every day.',
        answer: 'colleagues',
        options: ['tourists', 'colleagues', 'waiters', 'neighbors'],
        hintVi: 'Những người cùng làm việc trong công ty.',
      },
    ],
    questions: [
      {
        id: 'work-l1',
        question: 'What should the student be ready to explain during the interview?',
        options: [
          'Their favorite classroom',
          'One university project they are proud of',
          'Their expected promotion',
          'Library opening hours',
        ],
        correctIndex: 1,
        explanationVi: 'Mentor dặn: "be ready to explain one university project you are proud of."',
      },
      {
        id: 'work-l2',
        question: 'What two physical items does the mentor suggest bringing?',
        options: [
          'A passport and umbrella',
          'A clean notebook and a laptop',
          'A camera and headphones',
          'Two textbooks and a mug',
        ],
        correctIndex: 1,
        explanationVi: 'Mentor khuyên: "bring a clean notebook and your laptop."',
      },
    ],
    goldenPhrases: [
      {
        phrase: 'Congratulations on getting ...!',
        meaningVi: 'Chúc mừng bạn đã đạt được ...!',
        usageVi: 'Cấu trúc chúc mừng chuẩn: Congratulations ON + V-ing / Danh từ.',
      },
      {
        phrase: 'be ready to explain ...',
        meaningVi: 'sẵn sàng giải thích ...',
        usageVi: 'Rất hữu ích khi chuẩn bị phỏng vấn hoặc thuyết trình.',
      },
      {
        phrase: 'listen closely to feedback',
        meaningVi: 'lắng nghe kỹ phản hồi',
        usageVi: 'Collocation chuẩn trong môi trường công sở và học thuật.',
      },
    ],
  },
  reading: {
    title: 'Cách vượt qua deadline mà không căng thẳng',
    subtitleEn: 'How to Beat Deadlines Without Stress',
    cefr: 'B1',
    genreLabel: 'Bài đọc kỹ năng · Quản lý thời gian',
    warmUpVi: 'Đọc phương pháp quản lý deadline hiệu quả cho sinh viên và người đi làm. Chạm từ tô tím để tra nghĩa ngay.',
    glossary: [
      { word: 'deadline', ipa: '/ˈded.laɪn/', pos: 'n', meaningVi: 'hạn chót' },
      { word: 'assignment', ipa: '/əˈsaɪn.mənt/', pos: 'n', meaningVi: 'bài tập lớn, nhiệm vụ' },
      { word: 'schedule', ipa: '/ˈskedʒ.uːl/', pos: 'n', meaningVi: 'lịch trình, thời gian biểu' },
      { word: 'colleague', ipa: '/ˈkɑː.liːɡ/', pos: 'n', meaningVi: 'đồng nghiệp' },
      { word: 'feedback', ipa: '/ˈfiːd.bæk/', pos: 'n', meaningVi: 'phản hồi' },
    ],
    passageEn:
      'Missing a deadline rarely happens because a task is impossible; it usually happens because we start too late. When you receive a big assignment, break it into three smaller milestones on your weekly schedule. Spend twenty-five focused minutes working without checking phone messages, then take a short five-minute break. If you get stuck, ask a colleague or lecturer for early feedback instead of waiting until the final night.',
    passageVi:
      'Trễ hạn chót hiếm khi xảy ra vì nhiệm vụ bất khả thi; nó thường xảy ra vì ta bắt đầu quá muộn. Khi nhận một bài tập lớn, hãy chia nhỏ nó thành 3 cột mốc trên lịch tuần. Dành 25 phút tập trung cao độ mà không kiểm tra tin nhắn điện thoại, sau đó nghỉ ngắn 5 phút. Nếu gặp bế tắc, hãy xin phản hồi sớm từ đồng nghiệp hoặc giảng viên thay vì đợi đến đêm cuối cùng.',
    trueFalse: [
      {
        id: 'work-tf1',
        statement: 'Most missed deadlines happen because the task is completely impossible.',
        isTrue: false,
        evidenceEn: 'Missing a deadline rarely happens because a task is impossible; it usually happens because we start too late.',
        explanationVi: 'Sai (False). Nguyên nhân chính là do bắt đầu quá muộn.',
      },
      {
        id: 'work-tf2',
        statement: 'Asking for feedback early is better than waiting until the last night.',
        isTrue: true,
        evidenceEn: 'If you get stuck, ask a colleague or lecturer for early feedback instead of waiting until the final night.',
        explanationVi: 'Đúng (True). Bài viết khuyên chủ động xin góp ý sớm.',
      },
    ],
    questions: [
      {
        id: 'work-r1',
        question: 'How long is each focused work block recommended in the passage?',
        options: ['10 minutes', '25 minutes', '45 minutes', '90 minutes'],
        correctIndex: 1,
        explanationVi: 'Bài viết gợi ý kỹ thuật Pomodoro: "Spend twenty-five focused minutes working... then take a short five-minute break."',
      },
      {
        id: 'work-r2',
        question: 'What should you do when you receive a big assignment?',
        options: [
          'Wait until the final night',
          'Break it into three smaller milestones',
          'Check phone messages often',
          'Skip your weekly schedule',
        ],
        correctIndex: 1,
        explanationVi: 'Câu 2 nêu rõ: "break it into three smaller milestones on your weekly schedule."',
      },
    ],
  },
};

const HEALTH_SKILLS: TopicSkillsPack = {
  grammar: {
    title: 'Đưa lời khuyên & chỉ dẫn bằng Should / Shouldn\'t và Must',
    subtitleEn: 'Should / Shouldn\'t & Must for Health Advice',
    cefr: 'A2–B1',
    summaryVi: 'Dùng "should / shouldn\'t" để khuyên nhủ nhẹ nhàng về sức khỏe và "must / have to" cho chỉ dẫn y tế quan trọng.',
    discoveryContextVi: 'Đọc đoạn tư vấn của bác sĩ và nhận ra mức độ mạnh nhẹ giữa "should" và "must":',
    discoveryDialogue: [
      {
        speaker: 'Doctor',
        lineEn: 'You should stretch for five minutes every morning and drink more water.',
        highlight: 'should stretch',
        lineVi: 'Bạn nên giãn cơ 5 phút mỗi sáng và uống thêm nhiều nước.',
      },
      {
        speaker: 'Doctor',
        lineEn: 'And you must take this medicine after meals — never on an empty stomach.',
        highlight: 'must take this medicine',
        lineVi: 'Và bạn bắt buộc phải uống thuốc này sau bữa ăn — tuyệt đối không uống lúc đói.',
      },
    ],
    discoveryTakeawayVi: 'Nhận xét: Sau "should / shouldn\'t / must", động từ LUÔN ở dạng nguyên mẫu không "to" (should stretch, must take — KHÔNG nói "should to stretch").',
    formulas: [
      {
        label: 'Lời khuyên nên làm',
        pattern: 'S + should + V nguyên mẫu (không "to")',
        exampleEn: 'You should sleep at least seven hours before an exam.',
        exampleVi: 'Bạn nên ngủ ít nhất 7 tiếng trước kỳ thi.',
      },
      {
        label: 'Lời khuyên nên tránh',
        pattern: 'S + shouldn\'t + V nguyên mẫu',
        exampleEn: 'You shouldn\'t skip stretching after jogging in the park.',
        exampleVi: 'Bạn không nên bỏ qua bước giãn cơ sau khi chạy bộ ở công viên.',
      },
      {
        label: 'Bắt buộc / Chỉ định y tế',
        pattern: 'S + must / mustn\'t + V nguyên mẫu',
        exampleEn: 'Patients must take this medicine after meals, never on an empty stomach.',
        exampleVi: 'Bệnh nhân bắt buộc uống thuốc này sau bữa ăn, không uống khi bụng đói.',
      },
    ],
    commonMistakes: [
      {
        wrong: 'You should to drink warm water when you have a cough.',
        right: 'You should drink warm water when you have a cough.',
        whyVi: 'Động từ khuyết thiếu (should, must, can) KHÔNG đi kèm "to" → dùng trực tiếp động từ nguyên mẫu "drink".',
      },
      {
        wrong: 'He shoulds rest at home today.',
        right: 'He should rest at home today.',
        whyVi: 'Không bao giờ thêm "-s" vào "should" hoặc "must" dù chủ ngữ là He/She/It.',
      },
    ],
    tipVi: 'Mẹo nhanh: "Should" là lời khuyên thân thiện ("nên"), còn "Must" là quy tắc/chỉ định mạnh ("phải"). Cả hai đều cộng V nguyên mẫu không "to".',
    questions: [
      {
        id: 'health-g1',
        question: 'You have had a fever for two days. You ___ visit a doctor today.',
        options: ['should', 'should to', 'shoulds', 'must to'],
        correctIndex: 0,
        explanationVi: 'Sau động từ khuyết thiếu "should" là động từ nguyên mẫu không "to" ("should visit").',
      },
      {
        id: 'health-g2',
        question: 'If you want better sleep recovery, you ___ look at bright screens in bed.',
        options: ['should', 'shouldn\'t', 'must', 'have to'],
        correctIndex: 1,
        explanationVi: 'Lời khuyên nên tránh thói quen xấu trước khi ngủ → dùng "shouldn\'t".',
      },
    ],
    errorDrill: {
      id: 'health-err1',
      promptVi: 'Chạm vào phần BỊ SAI trong lời khuyên sức khỏe sau:',
      segments: ['Everyone', 'should to drink', 'plenty of water during summer.'],
      wrongIndex: 1,
      correction: 'should drink',
      explanationVi: 'Sau "should" không có "to" → phải sửa thành "should drink".',
    },
    sentenceBuilder: {
      id: 'health-sb1',
      promptVi: 'Ghép thành lời khuyên chuẩn: "Bạn không nên uống cà phê vào buổi tối muộn."',
      answerTokens: ['You', 'shouldn\'t', 'drink', 'coffee', 'late', 'at night.'],
      distractorTokens: ['to', 'drinks'],
      explanationVi: 'Cấu trúc: You + shouldn\'t + drink (V nguyên mẫu) + coffee + late at night.',
    },
  },
  listening: {
    title: 'Nghe bác sĩ tư vấn triệu chứng cảm sốt',
    subtitleEn: 'Checking In with a Clinic Doctor',
    cefr: 'A2–B1',
    contextVi: 'Bệnh nhân đến phòng khám mô tả triệu chứng mệt mỏi và nghe lời khuyên từ bác sĩ.',
    guidingQuestionVi: 'Khi nghe, hãy chú ý: Bệnh nhân bị triệu chứng gì và bác sĩ khuyên uống nước như thế nào?',
    preWords: [
      { word: 'fever', ipa: '/ˈfiː.vər/', pos: 'n', meaningVi: 'cơn sốt' },
      { word: 'cough', ipa: '/kɔːf/', pos: 'n', meaningVi: 'cơn ho' },
      { word: 'pharmacy', ipa: '/ˈfɑːr.mə.si/', pos: 'n', meaningVi: 'hiệu thuốc' },
      { word: 'hydration', ipa: '/haɪˈdreɪ.ʃən/', pos: 'n', meaningVi: 'sự cấp nước cho cơ thể' },
    ],
    dialogue: [
      {
        speaker: 'Doctor',
        en: 'Hello! What brings you to the clinic today?',
        vi: 'Chào bạn! Hôm nay bạn gặp vấn đề gì mà đến phòng khám vậy?',
      },
      {
        speaker: 'Patient',
        en: 'I have had a mild fever and a dry cough since Tuesday night.',
        vi: 'Em bị sốt nhẹ và ho khan từ tối thứ Ba ạ.',
      },
      {
        speaker: 'Doctor',
        en: 'Let me check your temperature. Good news — it is just a seasonal cold, nothing serious.',
        vi: 'Để bác sĩ đo nhiệt độ nhé. Tin tốt là chỉ bị cảm lạnh theo mùa thôi, không nghiêm trọng đâu.',
      },
      {
        speaker: 'Patient',
        en: 'Should I take any medicine from the pharmacy?',
        vi: 'Em có cần uống thuốc gì từ hiệu thuốc không ạ?',
      },
      {
        speaker: 'Doctor',
        en: 'Take this mild medicine after lunch, focus on hydration with warm water, and rest for two days before returning to jogging.',
        vi: 'Uống thuốc nhẹ này sau bữa trưa, chú trọng cấp nước bằng nước ấm và nghỉ ngơi hai ngày trước khi quay lại chạy bộ nhé.',
      },
    ],
    gaps: [
      {
        id: 'health-gap1',
        before: 'I have had a mild',
        after: 'and a dry cough since Tuesday night.',
        answer: 'fever',
        options: ['fever', 'stamina', 'vitamin', 'posture'],
        hintVi: 'Triệu chứng thân nhiệt tăng cao.',
      },
      {
        id: 'health-gap2',
        before: 'Focus on',
        after: 'with warm water, and rest for two days.',
        answer: 'hydration',
        options: ['hydration', 'meditation', 'presentation', 'vacation'],
        hintVi: 'Việc bổ sung đủ nước cho cơ thể.',
      },
    ],
    questions: [
      {
        id: 'health-l1',
        question: 'What symptoms has the patient had since Tuesday night?',
        options: [
          'A broken ankle',
          'A mild fever and a dry cough',
          'Back pain from yoga',
          'A food allergy',
        ],
        correctIndex: 1,
        explanationVi: 'Bệnh nhân nói: "I have had a mild fever and a dry cough since Tuesday night."',
      },
      {
        id: 'health-l2',
        question: 'How long should the patient rest before jogging again?',
        options: ['One hour', 'Two days', 'Two weeks', 'One month'],
        correctIndex: 1,
        explanationVi: 'Bác sĩ dặn: "rest for two days before returning to jogging."',
      },
    ],
    goldenPhrases: [
      {
        phrase: 'What brings you to the clinic today?',
        meaningVi: 'Hôm nay bạn gặp vấn đề gì mà đến phòng khám?',
        usageVi: 'Câu mở đầu chuẩn của bác sĩ tiếng Anh.',
      },
      {
        phrase: 'I have had ... since ...',
        meaningVi: 'Tôi bị (triệu chứng) từ lúc ... đến giờ.',
        usageVi: 'Dùng Hiện tại hoàn thành để mô tả triệu chứng kéo dài.',
      },
      {
        phrase: 'nothing serious',
        meaningVi: 'không có gì nghiêm trọng đâu',
        usageVi: 'Cụm trấn an cực kỳ tự nhiên trong giao tiếp.',
      },
    ],
  },
  reading: {
    title: '5 phút mỗi ngày để tràn đầy năng lượng',
    subtitleEn: 'Five Minutes a Day for Better Energy',
    cefr: 'A2–B1',
    genreLabel: 'Bài đọc sức khỏe · Thói quen nhỏ',
    warmUpVi: 'Đọc bài viết về những thói quen 5 phút giúp tăng năng lượng và giấc ngủ sâu. Chạm từ tô tím để tra nghĩa ngay.',
    glossary: [
      { word: 'stamina', ipa: '/ˈstæm.ə.nə/', pos: 'n', meaningVi: 'sức bền, thể lực' },
      { word: 'stretching', ipa: '/ˈstretʃ.ɪŋ/', pos: 'n', meaningVi: 'động tác giãn cơ' },
      { word: 'posture', ipa: '/ˈpɑːs.tʃər/', pos: 'n', meaningVi: 'tư thế cơ thể' },
      { word: 'hydration', ipa: '/haɪˈdreɪ.ʃən/', pos: 'n', meaningVi: 'sự cấp nước' },
      { word: 'meditation', ipa: '/ˌmed.əˈteɪ.ʃən/', pos: 'n', meaningVi: 'thiền định' },
      { word: 'recovery', ipa: '/rɪˈkʌv.ər.i/', pos: 'n', meaningVi: 'sự hồi phục' },
    ],
    passageEn:
      'Staying healthy does not require spending two hours at the gym every day. Simple daily habits build lasting stamina and mental balance. Start your morning with five minutes of gentle stretching or yoga to protect your posture. Keep a water bottle on your desk for steady hydration, and eat citrus fruits rich in vitamin C. Before bed, ten minutes of quiet meditation helps calm your mind for deep sleep and full recovery.',
    passageVi:
      'Giữ gìn sức khỏe không đòi hỏi bạn phải ở phòng gym hai tiếng mỗi ngày. Những thói quen nhỏ hằng ngày sẽ xây dựng sức bền lâu dài và sự cân bằng tinh thần. Hãy bắt đầu buổi sáng bằng 5 phút giãn cơ nhẹ hoặc yoga để bảo vệ tư thế. Đặt sẵn bình nước trên bàn để cấp nước đều đặn và ăn trái cây họ cam quýt giàu vitamin C. Trước khi ngủ, 10 phút thiền tĩnh lặng giúp dịu tâm trí để ngủ sâu và hồi phục trọn vẹn.',
    trueFalse: [
      {
        id: 'health-tf1',
        statement: 'You must spend two hours at the gym every day to stay healthy.',
        isTrue: false,
        evidenceEn: 'Staying healthy does not require spending two hours at the gym every day.',
        explanationVi: 'Sai (False). Câu đầu khẳng định không cần tập 2 tiếng mỗi ngày.',
      },
      {
        id: 'health-tf2',
        statement: 'Ten minutes of quiet meditation before bed supports deep sleep.',
        isTrue: true,
        evidenceEn: 'Before bed, ten minutes of quiet meditation helps calm your mind for deep sleep and full recovery.',
        explanationVi: 'Đúng (True). Thiền 10 phút trước khi ngủ giúp ngủ sâu và hồi phục.',
      },
    ],
    questions: [
      {
        id: 'health-r1',
        question: 'How does the article suggest protecting your posture in the morning?',
        options: [
          'Two hours of heavy gym workouts',
          'Five minutes of gentle stretching or yoga',
          'Visiting the pharmacy',
          'Taking medicine after meals',
        ],
        correctIndex: 1,
        explanationVi: 'Bài đọc khuyên: "Start your morning with five minutes of gentle stretching or yoga to protect your posture."',
      },
      {
        id: 'health-r2',
        question: 'Why should you keep a water bottle on your desk?',
        options: [
          'For steady hydration',
          'To measure vitamin C',
          'To practice meditation',
          'To track your sleep',
        ],
        correctIndex: 0,
        explanationVi: 'Câu 4 nêu rõ: "Keep a water bottle on your desk for steady hydration."',
      },
    ],
  },
};

export function getTopicSkillsPack(topicTitle: string): TopicSkillsPack {
  const key = (topicTitle || '').toLowerCase();
  if (/food|drink|cafe|coffee/.test(key)) return FOOD_SKILLS;
  if (/health|lifestyle|sport|fitness/.test(key)) return HEALTH_SKILLS;
  if (/home|routine|house|daily/.test(key)) return HOME_SKILLS;
  if (/travel|explore|trip|airport/.test(key)) return TRAVEL_SKILLS;
  if (/work|study|office|job|career/.test(key)) return WORK_SKILLS;
  return FOOD_SKILLS;
}
