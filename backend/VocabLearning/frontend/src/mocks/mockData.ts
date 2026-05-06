export const mockData = {
    categories: [
        { id: 'comm', title: 'Daily Communication', icon: '💬', topicsCount: 10 },
        { id: 'work', title: 'Work & Education', icon: '💼', topicsCount: 9 },
        { id: 'health', title: 'Health', icon: '💪', topicsCount: 5 },
        { id: 'travel', title: 'Entertainment & Travel', icon: '✈️', topicsCount: 4 },
        { id: 'life', title: 'Daily Life', icon: '🏠', topicsCount: 10 },
        { id: 'emotions', title: 'Emotions & Opinions', icon: '💭', topicsCount: 3 },
        { id: 'science', title: 'Culture & Science', icon: '🌍', topicsCount: 3 },
    ],
    vocabulary: [
        { id: 1, word: 'Eloquent', transcription: '/ˈel.ə.kwənt/', meaning: 'Hùng hồn, có khả năng hùng biện', topicId: 1, cefr: 'C1', example: 'His eloquent speech moved the audience.', translation: 'Bài phát biểu hùng hồn của ông đã lay động khán giả.' },
        { id: 2, word: 'Pragmatic', transcription: '/præɡˈmæt.ɪk/', meaning: 'Thực dụng, thực tế', topicId: 1, cefr: 'B2', example: 'We need a pragmatic approach to this problem.', translation: 'Chúng ta cần một cách tiếp cận thực dụng cho vấn đề này.' },
        { id: 3, word: 'Resilient', transcription: '/rɪˈzɪl.jənt/', meaning: 'Kiên cường, mau phục hồi', topicId: 1, cefr: 'B2', example: 'She is a resilient woman who overcomes many obstacles.', translation: 'Cô ấy là một người phụ nữ kiên cường, vượt qua nhiều chướng ngại vật.' },
        { id: 4, word: 'Meticulous', transcription: '/məˈtɪk.jə.ləs/', meaning: 'Tỉ mỉ, kỹ càng', topicId: 2, cefr: 'C1', example: 'He is meticulous about his appearance.', translation: 'Anh ấy rất tỉ mỉ về ngoại hình của mình.' },
        { id: 5, word: 'Enigmatic', transcription: '/ˌen.ɪɡˈmæt.ɪk/', meaning: 'Bí ẩn, khó hiểu', topicId: 2, cefr: 'C2', example: 'The painting has an enigmatic smile.', translation: 'Bức tranh có một nụ cười bí ẩn.' },
        { id: 6, word: 'Innovation', transcription: '/ˌɪn.əˈveɪ.ʃən/', meaning: 'Sự đổi mới, sáng kiến', topicId: 11, cefr: 'B2', example: 'Innovation is the key to success.', translation: 'Đổi mới là chìa khóa của thành công.' },
        { id: 7, word: 'Strategy', transcription: '/ˈstræt.ə.dʒi/', meaning: 'Chiến lược', topicId: 11, cefr: 'B1', example: 'We need a new marketing strategy.', translation: 'Chúng ta cần một chiến lược tiếp thị mới.' },
        { id: 8, word: 'Collaborate', transcription: '/kəˈlæb.ə.reɪt/', meaning: 'Cộng tác', topicId: 11, cefr: 'B2', example: 'We should collaborate on this project.', translation: 'Chúng ta nên cộng tác trong dự án này.' },
        { id: 9, word: 'Productive', transcription: '/prəˈdʌk.tɪv/', meaning: 'Năng suất', topicId: 3, cefr: 'B1', example: 'I had a very productive day.', translation: 'Tôi đã có một ngày làm việc rất năng suất.' },
        { id: 10, word: 'Deadline', transcription: '/ˈded.laɪn/', meaning: 'Hạn chót', topicId: 3, cefr: 'A2', example: 'The deadline for the project is tomorrow.', translation: 'Hạn chót của dự án là vào ngày mai.' },
        { id: 11, word: 'Optimistic', transcription: '/ˌɒp.tɪˈmɪs.tɪk/', meaning: 'Lạc quan', topicId: 39, cefr: 'B2', example: 'She is optimistic about the future.', translation: 'Cô ấy lạc quan về tương lai.' },
        { id: 12, word: 'Frustrated', transcription: '/frʌsˈtreɪ.tɪd/', meaning: 'Thất vọng, nản lòng', topicId: 39, cefr: 'B1', example: 'I feel frustrated when I can\'t solve a problem.', translation: 'Tôi cảm thấy nản lòng khi không thể giải quyết một vấn đề.' },
        { id: 13, word: 'Symptom', transcription: '/ˈsɪmp.təm/', meaning: 'Triệu chứng', topicId: 21, cefr: 'B2', example: 'Fever is a common symptom of the flu.', translation: 'Sốt là một triệu chứng phổ biến của bệnh cúm.' },
        { id: 14, word: 'Treatment', transcription: '/ˈtriːt.mənt/', meaning: 'Điều trị', topicId: 21, cefr: 'B1', example: 'The doctor suggested a new treatment.', translation: 'Bác sĩ đề xuất một phương pháp điều trị mới.' },
        { id: 15, word: 'Adventure', transcription: '/ədˈven.tʃər/', meaning: 'Phiêu lưu', topicId: 26, cefr: 'A2', example: 'They went on an adventure in the mountains.', translation: 'Họ đã đi phiêu lưu trong vùng núi.' },
        { id: 16, word: 'Destination', transcription: '/ˌdes.tɪˈneɪ.ʃən/', meaning: 'Điểm đến', topicId: 26, cefr: 'B1', example: 'Paris is a popular travel destination.', translation: 'Paris là một điểm đến du lịch phổ biến.' },
        { id: 17, word: 'Recipe', transcription: '/ˈres.ɪ.pi/', meaning: 'Công thức nấu ăn', topicId: 36, cefr: 'A2', example: 'I found a great recipe for chocolate cake.', translation: 'Tôi đã tìm thấy một công thức bánh chocolate tuyệt vời.' },
        { id: 18, word: 'Ingredient', transcription: '/ɪnˈɡriː.di.ənt/', meaning: 'Thành phần', topicId: 36, cefr: 'B1', example: 'Fresh ingredients are key to a good meal.', translation: 'Nguyên liệu tươi là chìa khóa cho một bữa ăn ngon.' },
        { id: 19, word: 'Ecosystem', transcription: '/ˈiː.kəʊˌsɪs.təm/', meaning: 'Hệ sinh thái', topicId: 42, cefr: 'C1', example: 'The rainforest has a unique ecosystem.', translation: 'Rừng mưa nhiệt đới có một hệ sinh thái độc đáo.' },
        { id: 20, word: 'Sustainable', transcription: '/səˈsteɪ.nə.bəl/', meaning: 'Bền vững', topicId: 42, cefr: 'C1', example: 'We need to find more sustainable energy sources.', translation: 'Chúng ta cần tìm thêm các nguồn năng lượng bền vững.' },
    ],
    topics: [
        // Daily Communication (1-10)
        { id: 1, catId: 'comm', title: 'Greetings and Introductions', description: 'Chào hỏi và giới thiệu bản thân cơ bản.', icon: '👋', stats: { new: 5, review: 2, learned: 8 } },
        { id: 2, catId: 'comm', title: 'Family', description: 'Từ vựng về các thành viên trong gia đình.', icon: '👨‍👩-👧‍👦', stats: { new: 8, review: 0, learned: 0 } },
        { id: 3, catId: 'comm', title: 'Friends and Relationships', description: 'Mối quan hệ bạn bè và xã hội.', icon: '🤝', stats: { new: 10, review: 5, learned: 0 } },
        { id: 4, catId: 'comm', title: 'Weather', description: 'Các hiện tượng thời tiết thường gặp.', icon: '☀️', stats: { new: 7, review: 0, learned: 0 } },
        { id: 5, catId: 'comm', title: 'Numbers and Dates', description: 'Số đếm, ngày tháng và thời gian.', icon: '📅', stats: { new: 12, review: 0, learned: 0 } },
        { id: 6, catId: 'comm', title: 'Colors', description: 'Màu sắc và cách mô tả.', icon: '🎨', stats: { new: 10, review: 0, learned: 0 } },
        { id: 7, catId: 'comm', title: 'Household Items', description: 'Đồ dùng trong gia đình.', icon: '🏠', stats: { new: 15, review: 0, learned: 0 } },
        { id: 8, catId: 'comm', title: 'Asking for and Giving Directions', description: 'Hỏi và chỉ đường.', icon: '📍', stats: { new: 8, review: 0, learned: 0 } },
        { id: 9, catId: 'comm', title: 'Shopping', description: 'Mua sắm và mặc cả.', icon: '🛍️', stats: { new: 10, review: 0, learned: 0 } },
        { id: 10, catId: 'comm', title: 'Ordering Food', description: 'Gọi món và hội thoại tại nhà hàng.', icon: '🍽️', stats: { new: 9, review: 0, learned: 0 } },

        // Work & Education (11-19)
        { id: 11, catId: 'work', title: 'Jobs and Occupations', description: 'Các ngành nghề và công việc.', icon: '👨‍💼', stats: { new: 12, review: 0, learned: 0 } },
        { id: 12, catId: 'work', title: 'Office', description: 'Môi trường văn phòng.', icon: '🏢', stats: { new: 10, review: 0, learned: 0 } },
        { id: 13, catId: 'work', title: 'School and Education', description: 'Trường học và giáo dục.', icon: '🎓', stats: { new: 15, review: 0, learned: 0 } },
        { id: 14, catId: 'work', title: 'Basic Email Communication', description: 'Giao tiếp qua email cơ bản.', icon: '📧', stats: { new: 8, review: 0, learned: 0 } },
        { id: 15, catId: 'work', title: 'Daily Tasks at Work', description: 'Công việc hàng ngày tại công sở.', icon: '📝', stats: { new: 10, review: 0, learned: 0 } },
        { id: 16, catId: 'work', title: 'Team Meetings', description: 'Họp nhóm và thảo luận.', icon: '👥', stats: { new: 7, review: 0, learned: 0 } },
        { id: 17, catId: 'work', title: 'Schedules and Time', description: 'Lịch trình và quản lý thời gian.', icon: '⏰', stats: { new: 9, review: 0, learned: 0 } },
        { id: 18, catId: 'work', title: 'Office Equipment', description: 'Thiết bị văn phòng.', icon: '🖨️', stats: { new: 6, review: 0, learned: 0 } },
        { id: 19, catId: 'work', title: 'Colleagues', description: 'Đồng nghiệp và quan hệ công sở.', icon: '🤝', stats: { new: 8, review: 0, learned: 0 } },

        // Health (20-24)
        { id: 20, catId: 'health', title: 'Body Parts', description: 'Các bộ phận trên cơ thể.', icon: '🦶', stats: { new: 20, review: 0, learned: 0 } },
        { id: 21, catId: 'health', title: 'Illnesses and Health', description: 'Bệnh tật và sức khỏe.', icon: '🤒', stats: { new: 12, review: 0, learned: 0 } },
        { id: 22, catId: 'health', title: 'Exercise and Sports', description: 'Tập luyện và thể thao.', icon: '🏃', stats: { new: 10, review: 0, learned: 0 } },
        { id: 23, catId: 'health', title: 'Healthy Habits', description: 'Thói quen lành mạnh.', icon: '🥗', stats: { new: 8, review: 0, learned: 0 } },
        { id: 24, catId: 'health', title: 'Diet and Nutrition', description: 'Chế độ ăn uống và dinh dưỡng.', icon: '🍎', stats: { new: 10, review: 0, learned: 0 } },

        // Entertainment & Travel (25-28)
        { id: 25, catId: 'travel', title: 'Movies and Music', description: 'Điện ảnh và âm nhạc.', icon: '🎬', stats: { new: 15, review: 0, learned: 0 } },
        { id: 26, catId: 'travel', title: 'Travel and Exploration', description: 'Du lịch và khám phá.', icon: '🌍', stats: { new: 12, review: 0, learned: 0 } },
        { id: 27, catId: 'travel', title: 'Famous Places', description: 'Các địa danh nổi tiếng.', icon: '🗽', stats: { new: 10, review: 0, learned: 0 } },
        { id: 28, catId: 'travel', title: 'Hotels and Accommodation', description: 'Khách sạn và nơi lưu trú.', icon: '🏨', stats: { new: 8, review: 0, learned: 0 } },

        // Daily Life (29-38)
        { id: 29, catId: 'life', title: 'Food and Drinks', description: 'Thực phẩm và đồ uống.', icon: '🍔', stats: { new: 15, review: 0, learned: 0 } },
        { id: 30, catId: 'life', title: 'Supermarket', description: 'Đi siêu thị.', icon: '🛒', stats: { new: 10, review: 0, learned: 0 } },
        { id: 31, catId: 'life', title: 'Transportation', description: 'Phương tiện giao thông.', icon: '🚌', stats: { new: 12, review: 0, learned: 0 } },
        { id: 32, catId: 'life', title: 'Pets and Animals', description: 'Thú cưng và động vật.', icon: '🐶', stats: { new: 15, review: 0, learned: 0 } },
        { id: 33, catId: 'life', title: 'Leisure Time', description: 'Thời gian rảnh rỗi.', icon: '🪁', stats: { new: 8, review: 0, learned: 0 } },
        { id: 34, catId: 'life', title: 'Clothing and Shopping', description: 'Quần áo và mua sắm.', icon: '👗', stats: { new: 10, review: 0, learned: 0 } },
        { id: 35, catId: 'life', title: 'Daily Routines', description: 'Thói quen hàng ngày.', icon: '🚿', stats: { new: 12, review: 0, learned: 0 } },
        { id: 36, catId: 'life', title: 'Kitchen and Cooking', description: 'Bếp núc và nấu ăn.', icon: '🍳', stats: { new: 10, review: 0, learned: 0 } },
        { id: 37, catId: 'life', title: 'House Cleaning', description: 'Dọn dẹp nhà cửa.', icon: '🧹', stats: { new: 8, review: 0, learned: 0 } },
        { id: 38, catId: 'life', title: 'Technology and Internet', description: 'Công nghệ và Internet.', icon: '🌐', stats: { new: 15, review: 0, learned: 0 } },

        // Emotions & Opinions (39-41)
        { id: 39, catId: 'emotions', title: 'Feelings and Emotions', description: 'Cảm xúc và tình cảm.', icon: '😊', stats: { new: 15, review: 0, learned: 0 } },
        { id: 40, catId: 'emotions', title: 'Hobbies', description: 'Sở thích cá nhân.', icon: '🎨', stats: { new: 10, review: 0, learned: 0 } },
        { id: 41, catId: 'emotions', title: 'Personal Opinions', description: 'Quan điểm cá nhân.', icon: '💬', stats: { new: 12, review: 0, learned: 0 } },

        // Culture & Science (42-44)
        { id: 42, catId: 'science', title: 'Nature and Environment', description: 'Tự nhiên và môi trường.', icon: '🌿', stats: { new: 12, review: 0, learned: 0 } },
        { id: 43, catId: 'science', title: 'Wildlife', description: 'Động vật hoang dã.', icon: '🦁', stats: { new: 10, review: 0, learned: 0 } },
        { id: 44, catId: 'science', title: 'Books and Literature', description: 'Sách và văn học.', icon: '📚', stats: { new: 15, review: 0, learned: 0 } },
    ],
    gameData: {
        leaderboard: [
            { id: 1, username: 'AlexPro', xp: 2450, avatar: '🦊', rank: 1 },
            { id: 2, username: 'MinhDev', xp: 2100, avatar: '🐱', rank: 2 },
            { id: 3, username: 'SarahLearner', xp: 1850, avatar: '🐼', rank: 3 },
            { id: 4, username: 'You', xp: 1200, avatar: '👤', rank: 12 },
            { id: 5, username: 'JohnDoe', xp: 950, avatar: '🐨', rank: 15 },
        ],
        currentUser: {
            streak: 5,
            xp: 1200,
            streakFreezes: 2,
            lastStudyDate: '2026-04-16',
            studyHistory: ['2026-04-16', '2026-04-15', '2026-04-14', '2026-04-13', '2026-04-12'],
            rank: 12
        },
        groupStreak: [
            { id: 1, username: 'AlexPro', streak: 12, status: 'done', avatar: '🦊' },
            { id: 2, username: 'You', streak: 5, status: 'done', avatar: '👤' },
            { id: 3, username: 'MinhDev', streak: 8, status: 'waiting', avatar: '🐱' }
        ]
    }
};

export const readingPassages = [
    {
        topicId: 1,
        title: 'Modern Personalities',
        content: 'In today\'s fast-paced world, being pragmatic is often seen as a key to success. However, being eloquent and meticulous are equally important traits for leaders. A resilient person can bounce back from failures and maintain an enigmatic charm that inspires others.',
        questions: [
            { q: 'What is seen as a key to success?', options: ['Being pragmatic', 'Being emotional', 'Being lazy', 'Being loud'], correct: 0, explanation: 'Đoạn văn có ghi: "being pragmatic is often seen as a key to success".' },
            { q: 'Who needs to be eloquent and meticulous?', options: ['Students', 'Leaders', 'Artists', 'Drivers'], correct: 1, explanation: 'Đoạn văn nêu: "traits for leaders".' },
            { q: 'A resilient person can...', options: ['Give up easily', 'Bounce back from failure', 'Always be angry', 'Forget everything'], correct: 1, explanation: 'Đoạn văn ghi: "A resilient person can bounce back from failures".' },
            { q: 'The enigmatic charm...', options: ['Inspires others', 'Bores people', 'Scares children', 'Is annoying'], correct: 0, explanation: 'Đoạn văn có ý: "maintain an enigmatic charm that inspires others".' }
        ]
    },
    {
        topicId: 11,
        title: 'Modern Workplace Innovation',
        content: 'Innovation is the driving force behind modern jobs. Companies encourage employees to collaborate and develop a strategic mindset. Being productive isn\'t just about working hard, but working smart within the team.',
        questions: [
            { q: 'What is the driving force?', options: ['Salary', 'Innovation', 'Office space', 'Internet'], correct: 1, explanation: 'Text states: "Innovation is the driving force".' },
            { q: 'What should employees do?', options: ['Work alone', 'Collaborate', 'Sleep more', 'Watch movies'], correct: 1, explanation: 'Text says: "encourage employees to collaborate".' },
            { q: 'Productivity is about...', options: ['Working smart', 'Working 24/7', 'Being loud', 'Doing nothing'], correct: 0, explanation: 'Text states: "working smart within the team".' },
            { q: 'What kind of mindset is needed?', options: ['Strategic', 'Angry', 'Bored', 'Slow'], correct: 0, explanation: 'Text mentions: "develop a strategic mindset".' }
        ]
    },
    {
        topicId: 26,
        title: 'The Soul of Travel',
        content: 'Choosing a travel destination is more than just picking a spot on a map; it is an adventure into the unknown. Explorers seek experiences that challenge their perspectives and create lifelong memories.',
        questions: [
            { q: 'Picking a spot on a map is...', options: ['Everything', 'Just one part', 'Boring', 'Not necessary'], correct: 1, explanation: 'It is "more than just picking a spot".' },
            { q: 'What is an adventure?', options: ['The unknown', 'The map', 'The airport', 'The hotel'], correct: 0, explanation: 'It is "an adventure into the unknown".' },
            { q: 'Explorers seek...', options: ['Money', 'Memories', 'Food', 'Sleep'], correct: 1, explanation: 'They seek "experiences that... create lifelong memories".' },
            { q: 'What do experiences do?', options: ['Challenge perspectives', 'Waste time', 'Cost money', 'Are useless'], correct: 0, explanation: 'They "challenge their perspectives".' }
        ]
    }
];
