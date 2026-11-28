-- =============================================================================
-- Fresh Pedagogical Curriculum Seed: Everyday English (A1-B1)
-- Standards: Cambridge A2 Key (KET), B1 Preliminary (PET) & Oxford 3000
-- Structure: 2 Parent Modules -> 5 Thematic Units -> 20 Words Each (100 Words)
-- Includes: topics, vocabulary (with local WebP image_url), meaning, example,
--           and standard exercises (MATCH_MEANING, MATCH_IPA, FILLING).
-- Safe for both a brand-new empty DB (after init.sql) and resetting vocab
-- in an existing DB while preserving users, sticky notes, and audit logs.
-- =============================================================================

BEGIN;

-- Ensure image_url column exists even if running before standalone migration.
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS image_url VARCHAR(2048) NULL;

-- Reset curriculum & learning tables cleanly (preserves users & accounts).
TRUNCATE TABLE
    learning_log,
    exercise_result,
    exercise_session,
    learning_session_item,
    learning_session,
    progress,
    user_vocabulary,
    exercise,
    example,
    meaning,
    vocabulary,
    topic
RESTART IDENTITY CASCADE;

-- 1. Parent Modules (2)
INSERT INTO topic (topic_id, name, description, parent_topic_id) VALUES (1, 'Daily Life', 'Từ vựng nền tảng A1–A2 về ẩm thực, không gian sống và thói quen hằng ngày (chuẩn Cambridge KET & Oxford 3000).', NULL);
INSERT INTO topic (topic_id, name, description, parent_topic_id) VALUES (2, 'Real-World Communication', 'Từ vựng giao tiếp thực tế A2–B1 về du lịch, học tập – công việc và sức khỏe (chuẩn Cambridge PET & Oxford 3000).', NULL);

-- 2. Thematic Units (5 topics x 20 words = 100 words)
INSERT INTO topic (topic_id, name, description, parent_topic_id) VALUES (3, 'Food and Drinks', 'Gọi món, nguyên liệu, hương vị và trải nghiệm ăn uống hằng ngày (A1–B1).', 1);
INSERT INTO topic (topic_id, name, description, parent_topic_id) VALUES (4, 'Home and Daily Routines', 'Không gian sống, đồ dùng gia đình và các thói quen sinh hoạt hằng ngày (A1–B1).', 1);
INSERT INTO topic (topic_id, name, description, parent_topic_id) VALUES (5, 'Travel and Exploration', 'Sân bay, khách sạn, lên lịch trình và khám phá điểm đến mới (A1–B1).', 2);
INSERT INTO topic (topic_id, name, description, parent_topic_id) VALUES (6, 'Work and Study', 'Môi trường học đường, công sở, làm việc nhóm và phát triển sự nghiệp (A1–B1).', 2);
INSERT INTO topic (topic_id, name, description, parent_topic_id) VALUES (7, 'Health and Lifestyle', 'Thể thao, chăm sóc sức khỏe, y tế cơ bản và lối sống cân bằng (A1–B1).', 2);

-- 3. Vocabulary (100), Meanings (100), Examples (200), Exercises (300)

-- Topic: Food and Drinks (topic_id=3)
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (1, 'breakfast', '/ˈbrek.fəst/', NULL, '/vocab/breakfast.webp', 'A1', 'Bữa sáng', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (1, 'The first meal of the day, eaten in the morning.', 'Bữa sáng', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (1, 'I usually have eggs and toast for breakfast.', 'Tôi thường ăn trứng và bánh mì nướng cho bữa sáng.', NULL),
(1, 'Skipping breakfast makes it harder to focus in class.', 'Bỏ bữa sáng khiến bạn khó tập trung trong lớp hơn.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (1, 'MATCH_MEANING', 'MATCH_MEANING'), (1, 'MATCH_MEANING', 'MATCH_IPA'), (1, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (2, 'coffee', '/ˈkɒf.i/', NULL, '/vocab/coffee.webp', 'A1', 'Cà phê', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (2, 'A hot drink made from roasted coffee beans.', 'Cà phê', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (2, 'She drinks a cup of iced coffee every morning.', 'Cô ấy uống một ly cà phê đá mỗi sáng.', NULL),
(2, 'Would you like milk or sugar in your coffee?', 'Bạn có muốn thêm sữa hay đường vào cà phê không?', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (2, 'MATCH_MEANING', 'MATCH_MEANING'), (2, 'MATCH_MEANING', 'MATCH_IPA'), (2, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (3, 'bakery', '/ˈbeɪ.kər.i/', NULL, '/vocab/bakery.webp', 'A1', 'Tiệm bánh', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (3, 'A shop where bread, cakes, and pastries are baked and sold.', 'Tiệm bánh', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (3, 'We bought warm croissants from the neighborhood bakery.', 'Chúng tôi mua bánh sừng bò nóng từ tiệm bánh gần nhà.', NULL),
(3, 'The bakery opens at six o''clock every morning.', 'Tiệm bánh mở cửa lúc sáu giờ mỗi sáng.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (3, 'MATCH_MEANING', 'MATCH_MEANING'), (3, 'MATCH_MEANING', 'MATCH_IPA'), (3, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (4, 'vegetable', '/ˈvedʒ.tə.bəl/', NULL, '/vocab/vegetable.webp', 'A1', 'Rau củ', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (4, 'A plant or part of a plant used as food.', 'Rau củ', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (4, 'Eating fresh vegetables every day keeps you healthy.', 'Ăn rau củ tươi mỗi ngày giúp bạn khỏe mạnh.', NULL),
(4, 'He buys organic vegetables at the local market.', 'Anh ấy mua rau củ hữu cơ ở chợ địa phương.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (4, 'MATCH_MEANING', 'MATCH_MEANING'), (4, 'MATCH_MEANING', 'MATCH_IPA'), (4, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (5, 'menu', '/ˈmen.juː/', NULL, '/vocab/menu.webp', 'A1', 'Thực đơn', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (5, 'A list of food and drinks available in a restaurant.', 'Thực đơn', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (5, 'Could we see the lunch menu, please?', 'Cho chúng tôi xem thực đơn bữa trưa được không?', NULL),
(5, 'This restaurant updates its menu every season.', 'Nhà hàng này cập nhật thực đơn vào mỗi mùa.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (5, 'MATCH_MEANING', 'MATCH_MEANING'), (5, 'MATCH_MEANING', 'MATCH_IPA'), (5, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (6, 'waiter', '/ˈweɪ.tər/', NULL, '/vocab/waiter.webp', 'A1', 'Nhân viên phục vụ', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (6, 'A person whose job is to serve food and drinks at tables in a restaurant.', 'Nhân viên phục vụ', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (6, 'The waiter recommended the grilled salmon.', 'Nhân viên phục vụ gợi ý món cá hồi nướng.', NULL),
(6, 'We asked the waiter for two glasses of water.', 'Chúng tôi gọi nhân viên phục vụ mang hai ly nước.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (6, 'MATCH_MEANING', 'MATCH_MEANING'), (6, 'MATCH_MEANING', 'MATCH_IPA'), (6, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (7, 'dessert', '/dɪˈzɜːt/', NULL, '/vocab/dessert.webp', 'A1', 'Món tráng miệng', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (7, 'Sweet food eaten at the end of a meal.', 'Món tráng miệng', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (7, 'We ordered chocolate cake for dessert.', 'Chúng tôi gọi bánh sô-cô-la làm món tráng miệng.', NULL),
(7, 'Fresh fruit is a light and healthy dessert.', 'Trái cây tươi là một món tráng miệng nhẹ và tốt cho sức khỏe.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (7, 'MATCH_MEANING', 'MATCH_MEANING'), (7, 'MATCH_MEANING', 'MATCH_IPA'), (7, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (8, 'cook', '/kʊk/', NULL, '/vocab/cook.webp', 'A1', 'Nấu ăn', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (8, 'To prepare food by heating it.', 'Nấu ăn', 'verb');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (8, 'My father loves to cook traditional Vietnamese soup.', 'Bố tôi thích nấu món canh truyền thống Việt Nam.', NULL),
(8, 'Learning to cook at home saves a lot of money.', 'Học nấu ăn tại nhà giúp tiết kiệm rất nhiều tiền.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (8, 'MATCH_MEANING', 'MATCH_MEANING'), (8, 'MATCH_MEANING', 'MATCH_IPA'), (8, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (9, 'ingredient', '/ɪnˈɡriː.di.ənt/', NULL, '/vocab/ingredient.webp', 'A2', 'Nguyên liệu, thành phần', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (9, 'One of the foods or substances used to make a dish.', 'Nguyên liệu, thành phần', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (9, 'Fresh herbs are an essential ingredient in pho.', 'Rau thơm tươi là nguyên liệu không thể thiếu trong món phở.', NULL),
(9, 'Always check the ingredients on the food label.', 'Luôn kiểm tra danh sách thành phần trên nhãn thực phẩm.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (9, 'MATCH_MEANING', 'MATCH_MEANING'), (9, 'MATCH_MEANING', 'MATCH_IPA'), (9, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (10, 'recipe', '/ˈres.ə.pi/', NULL, '/vocab/recipe.webp', 'A2', 'Công thức nấu ăn', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (10, 'A set of instructions for preparing a particular dish.', 'Công thức nấu ăn', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (10, 'She followed her grandmother''s recipe to make the sauce.', 'Cô ấy làm theo công thức của bà để nấu nước sốt.', NULL),
(10, 'I found an easy pasta recipe online.', 'Tôi tìm thấy một công thức làm mì Ý rất dễ trên mạng.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (10, 'MATCH_MEANING', 'MATCH_MEANING'), (10, 'MATCH_MEANING', 'MATCH_IPA'), (10, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (11, 'beverage', '/ˈbev.ər.ɪdʒ/', NULL, '/vocab/beverage.webp', 'A2', 'Đồ uống, thức uống', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (11, 'Any type of drink other than water.', 'Đồ uống, thức uống', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (11, 'Hot beverages like tea and coffee are served all day.', 'Đồ uống nóng như trà và cà phê được phục vụ cả ngày.', NULL),
(11, 'The price includes one complimentary beverage.', 'Giá đã bao gồm một thức uống miễn phí.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (11, 'MATCH_MEANING', 'MATCH_MEANING'), (11, 'MATCH_MEANING', 'MATCH_IPA'), (11, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (12, 'spicy', '/ˈspaɪ.si/', NULL, '/vocab/spicy.webp', 'A2', 'Cay nồng', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (12, 'Containing strong flavors from spices such as chili.', 'Cay nồng', 'adjective');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (12, 'Central Vietnamese dishes are often quite spicy.', 'Các món ăn miền Trung Việt Nam thường khá cay.', NULL),
(12, 'Please make the noodles less spicy for the kids.', 'Làm ơn nấu mì bớt cay cho bọn trẻ nhé.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (12, 'MATCH_MEANING', 'MATCH_MEANING'), (12, 'MATCH_MEANING', 'MATCH_IPA'), (12, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (13, 'delicious', '/dɪˈlɪʃ.əs/', NULL, '/vocab/delicious.webp', 'A2', 'Ngon miệng', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (13, 'Having a very pleasant taste or smell.', 'Ngon miệng', 'adjective');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (13, 'The homemade dumplings were absolutely delicious.', 'Món há cảo tự làm thực sự rất ngon.', NULL),
(13, 'Thank you for such a delicious dinner.', 'Cảm ơn bạn vì một bữa tối thật ngon miệng.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (13, 'MATCH_MEANING', 'MATCH_MEANING'), (13, 'MATCH_MEANING', 'MATCH_IPA'), (13, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (14, 'fresh', '/freʃ/', NULL, '/vocab/fresh.webp', 'A2', 'Tươi, mới', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (14, 'Recently made, picked, or caught and not preserved.', 'Tươi, mới', 'adjective');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (14, 'We bought fresh seafood right near the harbor.', 'Chúng tôi mua hải sản tươi ngay gần bến cảng.', NULL),
(14, 'Nothing beats a glass of fresh orange juice.', 'Không gì tuyệt hơn một ly nước cam tươi.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (14, 'MATCH_MEANING', 'MATCH_MEANING'), (14, 'MATCH_MEANING', 'MATCH_IPA'), (14, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (15, 'order', '/ˈɔː.dər/', NULL, '/vocab/order.webp', 'A2', 'Gọi món, đặt hàng', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (15, 'To ask for food or drinks in a restaurant.', 'Gọi món, đặt hàng', 'verb');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (15, 'Are you ready to order, or do you need a few more minutes?', 'Bạn đã sẵn sàng gọi món chưa hay cần thêm vài phút?', NULL),
(15, 'Let''s order a large pizza to share.', 'Hãy gọi một chiếc pizza lớn để chia nhau ăn.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (15, 'MATCH_MEANING', 'MATCH_MEANING'), (15, 'MATCH_MEANING', 'MATCH_IPA'), (15, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (16, 'bill', '/bɪl/', NULL, '/vocab/bill.webp', 'A2', 'Hóa đơn thanh toán', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (16, 'A written statement of how much money you owe for a meal or service.', 'Hóa đơn thanh toán', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (16, 'Excuse me, could we have the bill, please?', 'Xin lỗi, cho chúng tôi thanh toán hóa đơn được không?', NULL),
(16, 'We decided to split the bill equally.', 'Chúng tôi quyết định chia đều hóa đơn.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (16, 'MATCH_MEANING', 'MATCH_MEANING'), (16, 'MATCH_MEANING', 'MATCH_IPA'), (16, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (17, 'taste', '/teɪst/', NULL, '/vocab/taste.webp', 'B1', 'Nếm thử, có vị', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (17, 'To test the flavor of food or drink by putting a little in your mouth.', 'Nếm thử, có vị', 'verb');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (17, 'Always taste the soup before adding more salt.', 'Luôn nếm thử canh trước khi cho thêm muối.', NULL),
(17, 'This mango tastes sweet and slightly tangy.', 'Quả xoài này có vị ngọt và hơi chua nhẹ.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (17, 'MATCH_MEANING', 'MATCH_MEANING'), (17, 'MATCH_MEANING', 'MATCH_IPA'), (17, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (18, 'hungry', '/ˈhʌŋ.ɡri/', NULL, '/vocab/hungry.webp', 'A1', 'Đói bụng', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (18, 'Feeling that you want or need to eat food.', 'Đói bụng', 'adjective');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (18, 'After swimming for an hour, I was really hungry.', 'Sau khi bơi một tiếng, tôi thực sự rất đói.', NULL),
(18, 'Keep some healthy snacks handy when you feel hungry.', 'Hãy chuẩn bị sẵn vài món ăn nhẹ lành mạnh khi bạn thấy đói.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (18, 'MATCH_MEANING', 'MATCH_MEANING'), (18, 'MATCH_MEANING', 'MATCH_IPA'), (18, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (19, 'nutrition', '/njuːˈtrɪʃ.ən/', NULL, '/vocab/nutrition.webp', 'B1', 'Dinh dưỡng', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (19, 'The process of taking in food necessary for health and growth.', 'Dinh dưỡng', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (19, 'Good nutrition is essential for children''s development.', 'Dinh dưỡng tốt là yếu tố thiết yếu cho sự phát triển của trẻ em.', NULL),
(19, 'Balanced meals provide proper daily nutrition.', 'Bữa ăn cân bằng cung cấp nguồn dinh dưỡng hợp lý hằng ngày.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (19, 'MATCH_MEANING', 'MATCH_MEANING'), (19, 'MATCH_MEANING', 'MATCH_IPA'), (19, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (20, 'allergy', '/ˈæl.ə.dʒi/', NULL, '/vocab/allergy.webp', 'B1', 'Dị ứng', 3);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (20, 'A medical condition that causes a bad reaction to certain foods or substances.', 'Dị ứng', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (20, 'Please inform the staff if you have a peanut allergy.', 'Vui lòng báo cho nhân viên nếu bạn bị dị ứng đậu phộng.', NULL),
(20, 'Her seafood allergy stops her from eating shrimp.', 'Chứng dị ứng hải sản khiến cô ấy không ăn được tôm.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (20, 'MATCH_MEANING', 'MATCH_MEANING'), (20, 'MATCH_MEANING', 'MATCH_IPA'), (20, 'FILLING', NULL);

-- Topic: Home and Daily Routines (topic_id=4)
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (21, 'apartment', '/əˈpɑːt.mənt/', NULL, '/vocab/apartment.webp', 'A1', 'Căn hộ chung cư', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (21, 'A set of rooms for living in, usually on one floor of a building.', 'Căn hộ chung cư', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (21, 'They rent a bright two-bedroom apartment near the park.', 'Họ thuê một căn hộ hai phòng ngủ sáng sủa gần công viên.', NULL),
(21, 'Living in an apartment is convenient for city commuters.', 'Sống trong căn hộ rất tiện lợi cho người đi làm trong thành phố.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (21, 'MATCH_MEANING', 'MATCH_MEANING'), (21, 'MATCH_MEANING', 'MATCH_IPA'), (21, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (22, 'kitchen', '/ˈkɪtʃ.ən/', NULL, '/vocab/kitchen.webp', 'A1', 'Nhà bếp', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (22, 'A room where food is prepared and cooked.', 'Nhà bếp', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (22, 'The kitchen smells wonderful whenever she bakes bread.', 'Nhà bếp thơm nức mỗi khi cô ấy nướng bánh mì.', NULL),
(22, 'We renovated the kitchen with new wooden cabinets.', 'Chúng tôi cải tạo nhà bếp với tủ gỗ mới.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (22, 'MATCH_MEANING', 'MATCH_MEANING'), (22, 'MATCH_MEANING', 'MATCH_IPA'), (22, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (23, 'bedroom', '/ˈbed.ruːm/', NULL, '/vocab/bedroom.webp', 'A1', 'Phòng ngủ', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (23, 'A room used for sleeping in.', 'Phòng ngủ', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (23, 'My bedroom gets plenty of morning sunlight.', 'Phòng ngủ của tôi đón rất nhiều ánh nắng buổi sáng.', NULL),
(23, 'Keep electronic devices out of the bedroom for better sleep.', 'Hãy để thiết bị điện tử ngoài phòng ngủ để ngủ ngon hơn.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (23, 'MATCH_MEANING', 'MATCH_MEANING'), (23, 'MATCH_MEANING', 'MATCH_IPA'), (23, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (24, 'furniture', '/ˈfɜː.nɪ.tʃər/', NULL, '/vocab/furniture.webp', 'A1', 'Đồ nội thất', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (24, 'Large movable objects such as tables, chairs, and beds in a room.', 'Đồ nội thất', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (24, 'Minimalist wooden furniture makes the room feel larger.', 'Đồ nội thất gỗ tối giản khiến căn phòng trông rộng hơn.', NULL),
(24, 'We spent the weekend shopping for living room furniture.', 'Chúng tôi dành cuối tuần để mua sắm nội thất phòng khách.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (24, 'MATCH_MEANING', 'MATCH_MEANING'), (24, 'MATCH_MEANING', 'MATCH_IPA'), (24, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (25, 'curtain', '/ˈkɜː.tən/', NULL, '/vocab/curtain.webp', 'A1', 'Rèm cửa', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (25, 'A piece of cloth hung across a window to block light.', 'Rèm cửa', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (25, 'She drew the curtains to keep the afternoon heat out.', 'Cô ấy kéo rèm cửa lại để chắn nắng nóng buổi chiều.', NULL),
(25, 'Light linen curtains brighten up the whole room.', 'Rèm vải lanh sáng màu làm sáng bừng cả căn phòng.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (25, 'MATCH_MEANING', 'MATCH_MEANING'), (25, 'MATCH_MEANING', 'MATCH_IPA'), (25, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (26, 'blanket', '/ˈblæŋ.kɪt/', NULL, '/vocab/blanket.webp', 'A1', 'Chăn, mền', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (26, 'A thick warm cover used on a bed.', 'Chăn, mền', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (26, 'Grab an extra blanket because tonight will be chilly.', 'Lấy thêm một chiếc chăn vì tối nay trời sẽ se lạnh.', NULL),
(26, 'He folded the wool blanket neatly on the sofa.', 'Anh ấy gấp chiếc chăn len gọn gàng trên ghế sofa.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (26, 'MATCH_MEANING', 'MATCH_MEANING'), (26, 'MATCH_MEANING', 'MATCH_IPA'), (26, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (27, 'alarm', '/əˈlɑːm/', NULL, '/vocab/alarm.webp', 'A1', 'Đồng hồ báo thức', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (27, 'A device that makes a sound to wake you up or warn you.', 'Đồng hồ báo thức', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (27, 'I set my alarm for six thirty every weekday.', 'Tôi đặt báo thức lúc sáu giờ rưỡi mỗi ngày trong tuần.', NULL),
(27, 'He slept through his alarm and missed the bus.', 'Anh ấy ngủ quên không nghe báo thức và lỡ xe buýt.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (27, 'MATCH_MEANING', 'MATCH_MEANING'), (27, 'MATCH_MEANING', 'MATCH_IPA'), (27, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (28, 'mirror', '/ˈmɪr.ər/', NULL, '/vocab/mirror.webp', 'A1', 'Cái gương', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (28, 'A piece of glass with a shiny back that reflects an image.', 'Cái gương', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (28, 'She checked her outfit in the hallway mirror.', 'Cô ấy kiểm tra trang phục trong gương ở hành lang.', NULL),
(28, 'A large wall mirror makes a small hallway look wider.', 'Một chiếc gương tường lớn giúp hành lang nhỏ trông rộng hơn.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (28, 'MATCH_MEANING', 'MATCH_MEANING'), (28, 'MATCH_MEANING', 'MATCH_IPA'), (28, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (29, 'balcony', '/ˈbæl.kə.ni/', NULL, '/vocab/balcony.webp', 'A2', 'Ban công', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (29, 'A platform with a railing attached to the outside wall of a building.', 'Ban công', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (29, 'We enjoy drinking tea on the balcony at sunset.', 'Chúng tôi thích uống trà ngoài ban công lúc hoàng hôn.', NULL),
(29, 'She grows small potted herbs on her balcony.', 'Cô ấy trồng vài chậu rau thơm nhỏ ngoài ban công.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (29, 'MATCH_MEANING', 'MATCH_MEANING'), (29, 'MATCH_MEANING', 'MATCH_IPA'), (29, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (30, 'laundry', '/ˈlɔːn.dri/', NULL, '/vocab/laundry.webp', 'A2', 'Quần áo giặt giũ', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (30, 'Clothes and sheets that need to be washed or have just been washed.', 'Quần áo giặt giũ', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (30, 'I usually do the laundry on Sunday mornings.', 'Tôi thường giặt giũ quần áo vào sáng Chủ nhật.', NULL),
(30, 'Don''t forget to hang the wet laundry outside.', 'Đừng quên phơi quần áo ướt ra ngoài nhé.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (30, 'MATCH_MEANING', 'MATCH_MEANING'), (30, 'MATCH_MEANING', 'MATCH_IPA'), (30, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (31, 'tidy', '/ˈtaɪ.di/', NULL, '/vocab/tidy.webp', 'A2', 'Gọn gàng, ngăn nắp', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (31, 'Arranged neatly and in good order.', 'Gọn gàng, ngăn nắp', 'adjective');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (31, 'A tidy desk helps me stay productive all day.', 'Một bàn làm việc gọn gàng giúp tôi làm việc hiệu quả cả ngày.', NULL),
(31, 'Please keep your room tidy before guests arrive.', 'Hãy giữ phòng gọn gàng trước khi khách đến.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (31, 'MATCH_MEANING', 'MATCH_MEANING'), (31, 'MATCH_MEANING', 'MATCH_IPA'), (31, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (32, 'cozy', '/ˈkəʊ.zi/', NULL, '/vocab/cozy.webp', 'A2', 'Ấm cúng, dễ chịu', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (32, 'Warm, comfortable, and relaxing.', 'Ấm cúng, dễ chịu', 'adjective');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (32, 'The living room feels so cozy on rainy evenings.', 'Phòng khách thật ấm cúng vào những buổi tối mưa.', NULL),
(32, 'We found a cozy little reading corner by the window.', 'Chúng tôi tìm thấy một góc đọc sách nhỏ ấm cúng bên cửa sổ.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (32, 'MATCH_MEANING', 'MATCH_MEANING'), (32, 'MATCH_MEANING', 'MATCH_IPA'), (32, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (33, 'chore', '/tʃɔːr/', NULL, '/vocab/chore.webp', 'A2', 'Việc nhà, việc vặt', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (33, 'A routine task, especially a household one.', 'Việc nhà, việc vặt', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (33, 'Everyone in our family shares the household chores.', 'Mọi người trong gia đình tôi đều chia sẻ việc nhà.', NULL),
(33, 'Washing the dishes is my least favorite chore.', 'Rửa bát là việc nhà tôi ít thích nhất.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (33, 'MATCH_MEANING', 'MATCH_MEANING'), (33, 'MATCH_MEANING', 'MATCH_IPA'), (33, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (34, 'relax', '/rɪˈlæks/', NULL, '/vocab/relax.webp', 'A2', 'Thư giãn, nghỉ ngơi', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (34, 'To rest and become calm after work or stress.', 'Thư giãn, nghỉ ngơi', 'verb');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (34, 'Listening to soft music helps me relax after work.', 'Nghe nhạc nhẹ giúp tôi thư giãn sau giờ làm.', NULL),
(34, 'We stayed home to relax over the long weekend.', 'Chúng tôi ở nhà thư giãn suốt kỳ nghỉ cuối tuần dài.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (34, 'MATCH_MEANING', 'MATCH_MEANING'), (34, 'MATCH_MEANING', 'MATCH_IPA'), (34, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (35, 'schedule', '/ˈʃed.juːl/', NULL, '/vocab/schedule.webp', 'A2', 'Lịch trình, thời gian biểu', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (35, 'A plan that lists activities and the times they will happen.', 'Lịch trình, thời gian biểu', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (35, 'Keeping a daily schedule helps me balance study and rest.', 'Giữ lịch trình hằng ngày giúp tôi cân bằng việc học và nghỉ ngơi.', NULL),
(35, 'My schedule is completely full this Thursday.', 'Lịch trình của tôi kín mít vào thứ Năm tuần này.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (35, 'MATCH_MEANING', 'MATCH_MEANING'), (35, 'MATCH_MEANING', 'MATCH_IPA'), (35, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (36, 'neighbor', '/ˈneɪ.bər/', NULL, '/vocab/neighbor.webp', 'A2', 'Hàng xóm', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (36, 'Someone who lives near you.', 'Hàng xóm', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (36, 'Our next-door neighbor shared fresh fruit from her garden.', 'Cô hàng xóm bên cạnh chia sẻ trái cây tươi từ vườn nhà cô.', NULL),
(36, 'Friendly neighbors make a community feel safe.', 'Những người hàng xóm thân thiện khiến khu phố trở nên an toàn.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (36, 'MATCH_MEANING', 'MATCH_MEANING'), (36, 'MATCH_MEANING', 'MATCH_IPA'), (36, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (37, 'commute', '/kəˈmjuːt/', NULL, '/vocab/commute.webp', 'B1', 'Đi lại hằng ngày (từ nhà đến chỗ làm/học)', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (37, 'To travel regularly between home and work or school.', 'Đi lại hằng ngày (từ nhà đến chỗ làm/học)', 'verb');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (37, 'She commutes to the city center by train every day.', 'Cô ấy đi tàu vào trung tâm thành phố làm việc mỗi ngày.', NULL),
(37, 'A shorter commute gives you more time for your family.', 'Quãng đường đi làm ngắn hơn giúp bạn có nhiều thời gian hơn cho gia đình.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (37, 'MATCH_MEANING', 'MATCH_MEANING'), (37, 'MATCH_MEANING', 'MATCH_IPA'), (37, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (38, 'grocery', '/ˈɡrəʊ.sər.i/', NULL, '/vocab/grocery.webp', 'B1', 'Cửa hàng tạp hóa, thực phẩm thiết yếu', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (38, 'Food and household goods bought regularly at a store.', 'Cửa hàng tạp hóa, thực phẩm thiết yếu', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (38, 'I need to stop by the grocery store on my way home.', 'Tôi cần ghé cửa hàng tạp hóa trên đường về nhà.', NULL),
(38, 'We write a grocery list before going to the supermarket.', 'Chúng tôi viết danh sách đồ cần mua trước khi đi siêu thị.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (38, 'MATCH_MEANING', 'MATCH_MEANING'), (38, 'MATCH_MEANING', 'MATCH_IPA'), (38, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (39, 'appliance', '/əˈplaɪ.əns/', NULL, '/vocab/appliance.webp', 'B1', 'Thiết bị gia dụng', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (39, 'A machine designed to do a specific household job.', 'Thiết bị gia dụng', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (39, 'Energy-efficient appliances lower your monthly electricity bill.', 'Thiết bị gia dụng tiết kiệm điện giúp giảm hóa đơn tiền điện hằng tháng.', NULL),
(39, 'The kitchen comes equipped with modern appliances.', 'Nhà bếp được trang bị đầy đủ các thiết bị gia dụng hiện đại.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (39, 'MATCH_MEANING', 'MATCH_MEANING'), (39, 'MATCH_MEANING', 'MATCH_IPA'), (39, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (40, 'renovate', '/ˈren.ə.veɪt/', NULL, '/vocab/renovate.webp', 'B1', 'Cải tạo, sửa sang lại', 4);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (40, 'To repair and improve an old building or room.', 'Cải tạo, sửa sang lại', 'verb');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (40, 'They plan to renovate the old house before moving in.', 'Họ dự định cải tạo ngôi nhà cũ trước khi chuyển vào ở.', NULL),
(40, 'Renovating the bathroom took nearly three weeks.', 'Việc sửa sang phòng tắm mất gần ba tuần.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (40, 'MATCH_MEANING', 'MATCH_MEANING'), (40, 'MATCH_MEANING', 'MATCH_IPA'), (40, 'FILLING', NULL);

-- Topic: Travel and Exploration (topic_id=5)
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (41, 'passport', '/ˈpɑːs.pɔːt/', NULL, '/vocab/passport.webp', 'A1', 'Hộ chiếu', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (41, 'An official document needed to travel to foreign countries.', 'Hộ chiếu', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (41, 'Make sure your passport is valid for at least six months.', 'Hãy chắc chắn hộ chiếu của bạn còn hạn ít nhất sáu tháng.', NULL),
(41, 'Keep your passport in a safe pocket while traveling.', 'Hãy cất hộ chiếu ở ngăn an toàn khi đi du lịch.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (41, 'MATCH_MEANING', 'MATCH_MEANING'), (41, 'MATCH_MEANING', 'MATCH_IPA'), (41, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (42, 'luggage', '/ˈlʌɡ.ɪdʒ/', NULL, '/vocab/luggage.webp', 'A1', 'Hành lý', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (42, 'Bags and suitcases packed for a journey.', 'Hành lý', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (42, 'Please do not leave your luggage unattended at the airport.', 'Vui lòng không rời mắt khỏi hành lý tại sân bay.', NULL),
(42, 'We packed light luggage for our three-day trip.', 'Chúng tôi mang hành lý gọn nhẹ cho chuyến đi ba ngày.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (42, 'MATCH_MEANING', 'MATCH_MEANING'), (42, 'MATCH_MEANING', 'MATCH_IPA'), (42, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (43, 'airport', '/ˈeə.pɔːt/', NULL, '/vocab/airport.webp', 'A1', 'Sân bay', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (43, 'A place where airplanes take off and land, with buildings for passengers.', 'Sân bay', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (43, 'We arrived at the airport two hours before our flight.', 'Chúng tôi đến sân bay hai tiếng trước giờ bay.', NULL),
(43, 'The new airport terminal is spacious and easy to navigate.', 'Nhà ga sân bay mới rất rộng rãi và dễ tìm đường.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (43, 'MATCH_MEANING', 'MATCH_MEANING'), (43, 'MATCH_MEANING', 'MATCH_IPA'), (43, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (44, 'ticket', '/ˈtɪk.ɪt/', NULL, '/vocab/ticket.webp', 'A1', 'Vé (tàu, xe, máy bay)', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (44, 'A printed or digital pass showing you have paid for travel or entry.', 'Vé (tàu, xe, máy bay)', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (44, 'I booked a round-trip train ticket online.', 'Tôi đã đặt vé tàu khứ hồi trực tuyến.', NULL),
(44, 'Please show your ticket at the entrance gate.', 'Vui lòng xuất trình vé tại cổng vào.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (44, 'MATCH_MEANING', 'MATCH_MEANING'), (44, 'MATCH_MEANING', 'MATCH_IPA'), (44, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (45, 'hotel', '/həʊˈtel/', NULL, '/vocab/hotel.webp', 'A1', 'Khách sạn', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (45, 'A building where travelers pay to stay in rooms.', 'Khách sạn', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (45, 'Our hotel overlooks the beach and the harbor.', 'Khách sạn của chúng tôi nhìn ra bãi biển và bến cảng.', NULL),
(45, 'Check-in at the hotel starts at two in the afternoon.', 'Giờ nhận phòng khách sạn bắt đầu từ hai giờ chiều.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (45, 'MATCH_MEANING', 'MATCH_MEANING'), (45, 'MATCH_MEANING', 'MATCH_IPA'), (45, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (46, 'map', '/mæp/', NULL, '/vocab/map.webp', 'A1', 'Bản đồ', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (46, 'A drawing or plan of an area showing roads, cities, and landmarks.', 'Bản đồ', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (46, 'We checked the city map to find the nearest subway station.', 'Chúng tôi xem bản đồ thành phố để tìm ga tàu điện ngầm gần nhất.', NULL),
(46, 'Downloading an offline map is helpful when traveling abroad.', 'Tải bản đồ ngoại tuyến rất hữu ích khi du lịch nước ngoài.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (46, 'MATCH_MEANING', 'MATCH_MEANING'), (46, 'MATCH_MEANING', 'MATCH_IPA'), (46, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (47, 'backpack', '/ˈbæk.pæk/', NULL, '/vocab/backpack.webp', 'A2', 'Ba lô', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (47, 'A bag carried on your back using two straps.', 'Ba lô', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (47, 'He carried water and a camera in his hiking backpack.', 'Anh ấy mang theo nước và máy ảnh trong chiếc ba lô leo núi.', NULL),
(47, 'A sturdy backpack is ideal for weekend adventures.', 'Một chiếc ba lô chắc chắn rất lý tưởng cho chuyến phiêu lưu cuối tuần.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (47, 'MATCH_MEANING', 'MATCH_MEANING'), (47, 'MATCH_MEANING', 'MATCH_IPA'), (47, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (48, 'compass', '/ˈkʌm.pəs/', NULL, '/vocab/compass.webp', 'A2', 'La bàn', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (48, 'An instrument with a magnetic needle that shows direction.', 'La bàn', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (48, 'Hikers carry a compass when exploring remote trails.', 'Người đi bộ đường dài mang theo la bàn khi khám phá các cung đường xa.', NULL),
(48, 'The needle of a compass always points north.', 'Kim la bàn luôn chỉ về hướng bắc.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (48, 'MATCH_MEANING', 'MATCH_MEANING'), (48, 'MATCH_MEANING', 'MATCH_IPA'), (48, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (49, 'souvenir', '/ˌsuː.vənˈɪər/', NULL, '/vocab/souvenir.webp', 'A2', 'Quà lưu niệm', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (49, 'Something you buy or keep to remember a place you visited.', 'Quà lưu niệm', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (49, 'I bought hand-painted postcards as souvenirs for my friends.', 'Tôi mua bưu thiếp vẽ tay làm quà lưu niệm cho bạn bè.', NULL),
(49, 'The street market sells affordable local souvenirs.', 'Chợ đêm bán nhiều món quà lưu niệm địa phương giá phải chăng.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (49, 'MATCH_MEANING', 'MATCH_MEANING'), (49, 'MATCH_MEANING', 'MATCH_IPA'), (49, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (50, 'boarding pass', '/ˈbɔː.dɪŋ ˌpɑːs/', NULL, '/vocab/boarding-pass.webp', 'A2', 'Thẻ lên máy bay', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (50, 'A document or mobile code allowing you to enter an airplane.', 'Thẻ lên máy bay', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (50, 'Have your boarding pass ready before reaching the gate.', 'Hãy chuẩn bị sẵn thẻ lên máy bay trước khi đến cửa khởi hành.', NULL),
(50, 'You can save your boarding pass directly on your phone.', 'Bạn có thể lưu thẻ lên máy bay trực tiếp trên điện thoại.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (50, 'MATCH_MEANING', 'MATCH_MEANING'), (50, 'MATCH_MEANING', 'MATCH_IPA'), (50, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (51, 'departure', '/dɪˈpɑː.tʃər/', NULL, '/vocab/departure.webp', 'A2', 'Sự khởi hành', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (51, 'The act of leaving a place, especially to start a journey.', 'Sự khởi hành', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (51, 'The departure board showed a thirty-minute delay.', 'Bảng thông tin khởi hành báo chuyến bay bị trễ ba mươi phút.', NULL),
(51, 'Passengers should gather in the departure lounge early.', 'Hành khách nên có mặt sớm tại phòng chờ khởi hành.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (51, 'MATCH_MEANING', 'MATCH_MEANING'), (51, 'MATCH_MEANING', 'MATCH_IPA'), (51, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (52, 'destination', '/ˌdes.tɪˈneɪ.ʃən/', NULL, '/vocab/destination.webp', 'A2', 'Điểm đến', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (52, 'The place to which someone or something is going.', 'Điểm đến', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (52, 'Da Nang is a popular coastal destination in Vietnam.', 'Đà Nẵng là một điểm đến ven biển nổi tiếng ở Việt Nam.', NULL),
(52, 'After ten hours on the train, we reached our destination.', 'Sau mười tiếng đi tàu, chúng tôi đã đến điểm đến.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (52, 'MATCH_MEANING', 'MATCH_MEANING'), (52, 'MATCH_MEANING', 'MATCH_IPA'), (52, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (53, 'reservation', '/ˌrez.əˈveɪ.ʃən/', NULL, '/vocab/reservation.webp', 'A2', 'Sự đặt chỗ trước', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (53, 'An arrangement to keep a room, table, or seat for you.', 'Sự đặt chỗ trước', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (53, 'I made a hotel reservation for three nights in June.', 'Tôi đã đặt phòng khách sạn ba đêm vào tháng Sáu.', NULL),
(53, 'Do you have a reservation under the name Minh?', 'Bạn có đặt chỗ trước dưới tên Minh không?', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (53, 'MATCH_MEANING', 'MATCH_MEANING'), (53, 'MATCH_MEANING', 'MATCH_IPA'), (53, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (54, 'explore', '/ɪkˈsplɔːr/', NULL, '/vocab/explore.webp', 'A2', 'Khám phá', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (54, 'To travel around an area in order to learn about it.', 'Khám phá', 'verb');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (54, 'We rented bicycles to explore the ancient town.', 'Chúng tôi thuê xe đạp để khám phá khu phố cổ.', NULL),
(54, 'Solo travel encourages you to explore new cultures.', 'Du lịch một mình khuyến khích bạn khám phá những nền văn hóa mới.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (54, 'MATCH_MEANING', 'MATCH_MEANING'), (54, 'MATCH_MEANING', 'MATCH_IPA'), (54, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (55, 'itinerary', '/aɪˈtɪn.ər.ər.i/', NULL, '/vocab/itinerary.webp', 'B1', 'Lịch trình chuyến đi', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (55, 'A detailed plan of places to visit and activities during a trip.', 'Lịch trình chuyến đi', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (55, 'Our five-day itinerary includes both museums and beaches.', 'Lịch trình năm ngày của chúng tôi gồm cả bảo tàng và bãi biển.', NULL),
(55, 'She printed a copy of the itinerary for everyone in the group.', 'Cô ấy in một bản lịch trình cho mọi người trong đoàn.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (55, 'MATCH_MEANING', 'MATCH_MEANING'), (55, 'MATCH_MEANING', 'MATCH_IPA'), (55, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (56, 'customs', '/ˈkʌs.təmz/', NULL, '/vocab/customs.webp', 'B1', 'Hải quan', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (56, 'The official area at an airport or border where luggage and goods are checked.', 'Hải quan', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (56, 'Clearing customs took only fifteen minutes today.', 'Làm thủ tục hải quan hôm nay chỉ mất mười lăm phút.', NULL),
(56, 'You must declare valuable items at customs.', 'Bạn phải khai báo các vật phẩm có giá trị tại hải quan.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (56, 'MATCH_MEANING', 'MATCH_MEANING'), (56, 'MATCH_MEANING', 'MATCH_IPA'), (56, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (57, 'excursion', '/ɪkˈskɜː.ʒən/', NULL, '/vocab/excursion.webp', 'B1', 'Chuyến tham quan ngắn ngày', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (57, 'A short trip made for pleasure, often as part of a longer holiday.', 'Chuyến tham quan ngắn ngày', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (57, 'The resort organizes a boat excursion to nearby islands.', 'Khu nghỉ dưỡng tổ chức chuyến tham quan bằng thuyền tới các đảo gần đó.', NULL),
(57, 'Our afternoon excursion to the waterfall was unforgettable.', 'Chuyến tham quan thác nước buổi chiều thật khó quên.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (57, 'MATCH_MEANING', 'MATCH_MEANING'), (57, 'MATCH_MEANING', 'MATCH_IPA'), (57, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (58, 'landmark', '/ˈlænd.mɑːk/', NULL, '/vocab/landmark.webp', 'B1', 'Địa danh nổi tiếng, công trình biểu tượng', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (58, 'A well-known building or natural feature easily recognized from a distance.', 'Địa danh nổi tiếng, công trình biểu tượng', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (58, 'The Golden Bridge has become an iconic landmark in Da Nang.', 'Cầu Vàng đã trở thành một địa danh biểu tượng tại Đà Nẵng.', NULL),
(58, 'Tourists gather around the historic landmark at dusk.', 'Du khách tập trung quanh công trình lịch sử lúc hoàng hôn.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (58, 'MATCH_MEANING', 'MATCH_MEANING'), (58, 'MATCH_MEANING', 'MATCH_IPA'), (58, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (59, 'currency', '/ˈkʌr.ən.si/', NULL, '/vocab/currency.webp', 'B1', 'Tiền tệ', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (59, 'The system of money used in a particular country.', 'Tiền tệ', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (59, 'You can exchange foreign currency at the airport counter.', 'Bạn có thể đổi ngoại tệ tại quầy ở sân bay.', NULL),
(59, 'Always check the exchange rate before converting currency.', 'Luôn kiểm tra tỷ giá trước khi đổi tiền tệ.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (59, 'MATCH_MEANING', 'MATCH_MEANING'), (59, 'MATCH_MEANING', 'MATCH_IPA'), (59, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (60, 'accommodation', '/əˌkɒm.əˈdeɪ.ʃən/', NULL, '/vocab/accommodation.webp', 'B1', 'Chỗ ở, nơi lưu trú', 5);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (60, 'A place to stay, such as a hotel, hostel, or guesthouse.', 'Chỗ ở, nơi lưu trú', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (60, 'Book your accommodation early during the summer holiday.', 'Hãy đặt chỗ ở sớm trong kỳ nghỉ hè.', NULL),
(60, 'The tour package covers flights and four-star accommodation.', 'Gói tour bao gồm vé máy bay và chỗ ở tiêu chuẩn bốn sao.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (60, 'MATCH_MEANING', 'MATCH_MEANING'), (60, 'MATCH_MEANING', 'MATCH_IPA'), (60, 'FILLING', NULL);

-- Topic: Work and Study (topic_id=6)
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (61, 'laptop', '/ˈlæp.tɒp/', NULL, '/vocab/laptop.webp', 'A1', 'Máy tính xách tay', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (61, 'A small portable computer that you can carry easily.', 'Máy tính xách tay', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (61, 'I bring my laptop to every lecture to take notes.', 'Tôi mang máy tính xách tay đến mọi buổi học để ghi chú.', NULL),
(61, 'Make sure your laptop battery is charged before the exam.', 'Hãy đảm bảo pin máy tính xách tay đã sạc đầy trước kỳ thi.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (61, 'MATCH_MEANING', 'MATCH_MEANING'), (61, 'MATCH_MEANING', 'MATCH_IPA'), (61, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (62, 'notebook', '/ˈnəʊt.bʊk/', NULL, '/vocab/notebook.webp', 'A1', 'Sổ tay, vở ghi chép', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (62, 'A small book with blank or lined pages for writing notes.', 'Sổ tay, vở ghi chép', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (62, 'She writes new English words in her pocket notebook.', 'Cô ấy viết các từ tiếng Anh mới vào cuốn sổ tay bỏ túi.', NULL),
(62, 'He opened his notebook and sketched the diagram.', 'Anh ấy mở sổ tay ra và phác thảo sơ đồ.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (62, 'MATCH_MEANING', 'MATCH_MEANING'), (62, 'MATCH_MEANING', 'MATCH_IPA'), (62, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (63, 'library', '/ˈlaɪ.brər.i/', NULL, '/vocab/library.webp', 'A1', 'Thư viện', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (63, 'A building or room containing collections of books for reading or borrowing.', 'Thư viện', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (63, 'The university library stays open until midnight during finals.', 'Thư viện đại học mở cửa đến nửa đêm trong mùa thi.', NULL),
(63, 'I borrowed three reference books from the city library.', 'Tôi mượn ba cuốn sách tham khảo từ thư viện thành phố.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (63, 'MATCH_MEANING', 'MATCH_MEANING'), (63, 'MATCH_MEANING', 'MATCH_IPA'), (63, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (64, 'classroom', '/ˈklɑːs.ruːm/', NULL, '/vocab/classroom.webp', 'A1', 'Phòng học', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (64, 'A room in a school or college where lessons take place.', 'Phòng học', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (64, 'Students arranged the classroom desks in a circle for discussion.', 'Học sinh xếp bàn trong phòng học thành vòng tròn để thảo luận.', NULL),
(64, 'The classroom is equipped with a smart projector.', 'Phòng học được trang bị máy chiếu thông minh.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (64, 'MATCH_MEANING', 'MATCH_MEANING'), (64, 'MATCH_MEANING', 'MATCH_IPA'), (64, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (65, 'meeting', '/ˈmiː.tɪŋ/', NULL, '/vocab/meeting.webp', 'A1', 'Cuộc họp', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (65, 'An occasion when people come together to discuss or decide something.', 'Cuộc họp', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (65, 'Our weekly team meeting starts at nine o''clock sharp.', 'Cuộc họp nhóm hằng tuần của chúng tôi bắt đầu đúng chín giờ.', NULL),
(65, 'She prepared clear slides for the client meeting.', 'Cô ấy chuẩn bị các trang trình chiếu rõ ràng cho cuộc họp khách hàng.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (65, 'MATCH_MEANING', 'MATCH_MEANING'), (65, 'MATCH_MEANING', 'MATCH_IPA'), (65, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (66, 'colleague', '/ˈkɒl.iːɡ/', NULL, '/vocab/colleague.webp', 'A2', 'Đồng nghiệp', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (66, 'A person who works with you in the same organization or profession.', 'Đồng nghiệp', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (66, 'My colleagues helped me settle in during my first week.', 'Các đồng nghiệp đã giúp tôi hòa nhập trong tuần đầu tiên.', NULL),
(66, 'We often have lunch together with colleagues from the design team.', 'Chúng tôi thường ăn trưa cùng đồng nghiệp ở nhóm thiết kế.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (66, 'MATCH_MEANING', 'MATCH_MEANING'), (66, 'MATCH_MEANING', 'MATCH_IPA'), (66, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (67, 'resume', '/ˈrez.jʊ.meɪ/', NULL, '/vocab/resume.webp', 'A2', 'Sơ yếu lý lịch (CV)', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (67, 'A short written summary of your education, skills, and work experience.', 'Sơ yếu lý lịch (CV)', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (67, 'Tailor your resume to highlight relevant project experience.', 'Hãy điều chỉnh CV để làm nổi bật kinh nghiệm dự án liên quan.', NULL),
(67, 'She sent her updated resume to five technology companies.', 'Cô ấy gửi bản CV mới cập nhật tới năm công ty công nghệ.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (67, 'MATCH_MEANING', 'MATCH_MEANING'), (67, 'MATCH_MEANING', 'MATCH_IPA'), (67, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (68, 'interview', '/ˈɪn.tə.vjuː/', NULL, '/vocab/interview.webp', 'A2', 'Buổi phỏng vấn', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (68, 'A formal meeting in which someone asks you questions for a job or course.', 'Buổi phỏng vấn', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (68, 'He practiced common questions before his job interview.', 'Anh ấy luyện tập các câu hỏi phổ biến trước buổi phỏng vấn xin việc.', NULL),
(68, 'The online interview lasted about forty minutes.', 'Buổi phỏng vấn trực tuyến kéo dài khoảng bốn mươi phút.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (68, 'MATCH_MEANING', 'MATCH_MEANING'), (68, 'MATCH_MEANING', 'MATCH_IPA'), (68, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (69, 'presentation', '/ˌprez.ənˈteɪ.ʃən/', NULL, '/vocab/presentation.webp', 'A2', 'Bài thuyết trình', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (69, 'A talk giving information about a subject to an audience.', 'Bài thuyết trình', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (69, 'Our group delivered a confident final project presentation.', 'Nhóm chúng tôi đã có một bài thuyết trình đồ án cuối kỳ tự tin.', NULL),
(69, 'Visual charts make a presentation easier to follow.', 'Biểu đồ trực quan giúp bài thuyết trình dễ theo dõi hơn.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (69, 'MATCH_MEANING', 'MATCH_MEANING'), (69, 'MATCH_MEANING', 'MATCH_IPA'), (69, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (70, 'project', '/ˈprɒdʒ.ekt/', NULL, '/vocab/project.webp', 'A2', 'Dự án, đồ án', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (70, 'A planned piece of work designed to achieve a specific goal.', 'Dự án, đồ án', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (70, 'We are building a web application for our semester project.', 'Chúng tôi đang xây dựng một ứng dụng web cho đồ án học kỳ.', NULL),
(70, 'Good communication keeps the project on track.', 'Giao tiếp tốt giúp dự án đi đúng tiến độ.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (70, 'MATCH_MEANING', 'MATCH_MEANING'), (70, 'MATCH_MEANING', 'MATCH_IPA'), (70, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (71, 'assignment', '/əˈsaɪn.mənt/', NULL, '/vocab/assignment.webp', 'A2', 'Bài tập được giao', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (71, 'A piece of work given to students or employees as part of their studies or job.', 'Bài tập được giao', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (71, 'Please submit your written assignment before Friday evening.', 'Vui lòng nộp bài tập viết trước tối thứ Sáu.', NULL),
(71, 'This research assignment taught me how to analyze data.', 'Bài tập nghiên cứu này dạy tôi cách phân tích dữ liệu.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (71, 'MATCH_MEANING', 'MATCH_MEANING'), (71, 'MATCH_MEANING', 'MATCH_IPA'), (71, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (72, 'certificate', '/səˈtɪf.ɪ.kət/', NULL, '/vocab/certificate.webp', 'A2', 'Chứng chỉ, giấy chứng nhận', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (72, 'An official document proving that you have completed a course or passed an exam.', 'Chứng chỉ, giấy chứng nhận', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (72, 'She earned an English certificate with an impressive score.', 'Cô ấy đạt được chứng chỉ tiếng Anh với số điểm ấn tượng.', NULL),
(72, 'Every participant receives a completion certificate.', 'Mỗi người tham gia đều nhận được giấy chứng nhận hoàn thành.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (72, 'MATCH_MEANING', 'MATCH_MEANING'), (72, 'MATCH_MEANING', 'MATCH_IPA'), (72, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (73, 'salary', '/ˈsæl.ər.i/', NULL, '/vocab/salary.webp', 'A2', 'Tiền lương', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (73, 'A fixed regular payment made by an employer to an employee.', 'Tiền lương', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (73, 'The company offers a competitive starting salary for graduates.', 'Công ty đưa ra mức lương khởi điểm cạnh tranh cho sinh viên mới ra trường.', NULL),
(73, 'Salaries are transferred directly to employees'' bank accounts.', 'Tiền lương được chuyển trực tiếp vào tài khoản ngân hàng của nhân viên.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (73, 'MATCH_MEANING', 'MATCH_MEANING'), (73, 'MATCH_MEANING', 'MATCH_IPA'), (73, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (74, 'deadline', '/ˈded.laɪn/', NULL, '/vocab/deadline.webp', 'B1', 'Hạn chót', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (74, 'A time or date by which something must be finished.', 'Hạn chót', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (74, 'We worked together to meet the tight project deadline.', 'Chúng tôi phối hợp cùng nhau để kịp hạn chót gấp rút của dự án.', NULL),
(74, 'Set mini deadlines so you don''t rush at the last minute.', 'Hãy đặt các mốc hạn nhỏ để không bị vội vào phút chót.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (74, 'MATCH_MEANING', 'MATCH_MEANING'), (74, 'MATCH_MEANING', 'MATCH_IPA'), (74, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (75, 'scholarship', '/ˈskɒl.ə.ʃɪp/', NULL, '/vocab/scholarship.webp', 'B1', 'Học bổng', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (75, 'Money given to a student by an organization to help pay for their education.', 'Học bổng', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (75, 'He won a full scholarship to study engineering abroad.', 'Anh ấy giành được học bổng toàn phần du học ngành kỹ thuật.', NULL),
(75, 'Strong grades and community work boost your scholarship chances.', 'Điểm số tốt và hoạt động cộng đồng giúp tăng cơ hội nhận học bổng.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (75, 'MATCH_MEANING', 'MATCH_MEANING'), (75, 'MATCH_MEANING', 'MATCH_IPA'), (75, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (76, 'promotion', '/prəˈməʊ.ʃən/', NULL, '/vocab/promotion.webp', 'B1', 'Sự thăng chức', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (76, 'A move to a more important job or higher rank in a company.', 'Sự thăng chức', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (76, 'Her hard work led to a well-deserved promotion to team lead.', 'Sự nỗ lực của cô ấy đã mang lại đợt thăng chức xứng đáng lên trưởng nhóm.', NULL),
(76, 'The company supports internal promotion whenever possible.', 'Công ty luôn ưu tiên thăng chức nội bộ khi có thể.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (76, 'MATCH_MEANING', 'MATCH_MEANING'), (76, 'MATCH_MEANING', 'MATCH_IPA'), (76, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (77, 'collaborate', '/kəˈlæb.ə.reɪt/', NULL, '/vocab/collaborate.webp', 'B1', 'Hợp tác, cộng tác', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (77, 'To work together with others to produce or achieve something.', 'Hợp tác, cộng tác', 'verb');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (77, 'Engineers and designers collaborate closely on every feature.', 'Kỹ sư và nhà thiết kế hợp tác chặt chẽ trong từng tính năng.', NULL),
(77, 'Cloud tools make it easy to collaborate across time zones.', 'Công cụ đám mây giúp việc cộng tác xuyên múi giờ trở nên dễ dàng.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (77, 'MATCH_MEANING', 'MATCH_MEANING'), (77, 'MATCH_MEANING', 'MATCH_IPA'), (77, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (78, 'research', '/rɪˈsɜːtʃ/', NULL, '/vocab/research.webp', 'B1', 'Nghiên cứu', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (78, 'Careful study of a subject to discover new facts or information.', 'Nghiên cứu', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (78, 'Thorough user research prevented costly design mistakes.', 'Nghiên cứu người dùng kỹ lưỡng giúp tránh những sai lầm thiết kế tốn kém.', NULL),
(78, 'She is conducting research on renewable energy materials.', 'Cô ấy đang thực hiện nghiên cứu về vật liệu năng lượng tái tạo.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (78, 'MATCH_MEANING', 'MATCH_MEANING'), (78, 'MATCH_MEANING', 'MATCH_IPA'), (78, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (79, 'feedback', '/ˈfiːd.bæk/', NULL, '/vocab/feedback.webp', 'B1', 'Phản hồi, góp ý', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (79, 'Advice or comments about how well someone is doing a task.', 'Phản hồi, góp ý', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (79, 'Constructive feedback helps learners improve much faster.', 'Phản hồi mang tính xây dựng giúp người học tiến bộ nhanh hơn nhiều.', NULL),
(79, 'Thank you for your detailed feedback on my draft.', 'Cảm ơn bạn vì những góp ý chi tiết cho bản nháp của tôi.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (79, 'MATCH_MEANING', 'MATCH_MEANING'), (79, 'MATCH_MEANING', 'MATCH_IPA'), (79, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (80, 'internship', '/ˈɪn.tɜːn.ʃɪp/', NULL, '/vocab/internship.webp', 'B1', 'Kỳ thực tập', 6);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (80, 'A period of work experience offered to students or recent graduates.', 'Kỳ thực tập', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (80, 'My summer internship gave me real-world coding experience.', 'Kỳ thực tập mùa hè mang lại cho tôi kinh nghiệm lập trình thực tế.', NULL),
(80, 'Many students receive full-time offers after their internship.', 'Nhiều sinh viên nhận được lời mời làm chính thức sau kỳ thực tập.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (80, 'MATCH_MEANING', 'MATCH_MEANING'), (80, 'MATCH_MEANING', 'MATCH_IPA'), (80, 'FILLING', NULL);

-- Topic: Health and Lifestyle (topic_id=7)
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (81, 'exercise', '/ˈek.sə.saɪz/', NULL, '/vocab/exercise.webp', 'A1', 'Sự tập thể dục', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (81, 'Physical activity done to stay healthy and strong.', 'Sự tập thể dục', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (81, 'Thirty minutes of daily exercise improves your mood.', 'Ba mươi phút tập thể dục mỗi ngày giúp cải thiện tâm trạng.', NULL),
(81, 'Swimming is an excellent form of full-body exercise.', 'Bơi lội là một hình thức tập thể dục toàn thân tuyệt vời.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (81, 'MATCH_MEANING', 'MATCH_MEANING'), (81, 'MATCH_MEANING', 'MATCH_IPA'), (81, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (82, 'doctor', '/ˈdɒk.tər/', NULL, '/vocab/doctor.webp', 'A1', 'Bác sĩ', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (82, 'A qualified medical professional who treats sick or injured people.', 'Bác sĩ', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (82, 'The doctor advised him to rest and drink plenty of water.', 'Bác sĩ khuyên anh ấy nghỉ ngơi và uống nhiều nước.', NULL),
(82, 'You should see a doctor if the cough lasts more than a week.', 'Bạn nên đi khám bác sĩ nếu cơn ho kéo dài hơn một tuần.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (82, 'MATCH_MEANING', 'MATCH_MEANING'), (82, 'MATCH_MEANING', 'MATCH_IPA'), (82, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (83, 'medicine', '/ˈmed.ɪ.sən/', NULL, '/vocab/medicine.webp', 'A1', 'Thuốc chữa bệnh', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (83, 'A substance taken to treat or prevent an illness.', 'Thuốc chữa bệnh', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (83, 'Take this medicine twice a day after meals.', 'Uống thuốc này hai lần một ngày sau bữa ăn.', NULL),
(83, 'Keep all medicine out of the reach of young children.', 'Hãy để tất cả thuốc tránh xa tầm tay trẻ nhỏ.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (83, 'MATCH_MEANING', 'MATCH_MEANING'), (83, 'MATCH_MEANING', 'MATCH_IPA'), (83, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (84, 'sleep', '/sliːp/', NULL, '/vocab/sleep.webp', 'A1', 'Giấc ngủ', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (84, 'The natural resting state of the body and mind.', 'Giấc ngủ', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (84, 'Getting eight hours of quality sleep boosts memory.', 'Ngủ đủ tám tiếng chất lượng giúp tăng cường trí nhớ.', NULL),
(84, 'Avoid caffeine late at night so it doesn''t disturb your sleep.', 'Tránh caffeine vào đêm muộn để không ảnh hưởng đến giấc ngủ.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (84, 'MATCH_MEANING', 'MATCH_MEANING'), (84, 'MATCH_MEANING', 'MATCH_IPA'), (84, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (85, 'jogging', '/ˈdʒɒɡ.ɪŋ/', NULL, '/vocab/jogging.webp', 'A1', 'Chạy bộ chậm', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (85, 'The activity of running at a steady, gentle speed for fitness.', 'Chạy bộ chậm', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (85, 'He goes jogging along the riverfront every morning.', 'Anh ấy đi chạy bộ dọc bờ sông mỗi sáng.', NULL),
(85, 'Comfortable running shoes protect your knees while jogging.', 'Giày chạy êm ái giúp bảo vệ đầu gối khi chạy bộ.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (85, 'MATCH_MEANING', 'MATCH_MEANING'), (85, 'MATCH_MEANING', 'MATCH_IPA'), (85, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (86, 'yoga', '/ˈjəʊ.ɡə/', NULL, '/vocab/yoga.webp', 'A2', 'Bộ môn Yoga', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (86, 'A system of exercises combining breathing, posture, and relaxation.', 'Bộ môn Yoga', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (86, 'Morning yoga helps relieve stiffness in the back and shoulders.', 'Tập yoga buổi sáng giúp giảm căng cứng lưng và vai.', NULL),
(86, 'She joined a beginner yoga class near her apartment.', 'Cô ấy tham gia một lớp yoga cho người mới gần căn hộ.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (86, 'MATCH_MEANING', 'MATCH_MEANING'), (86, 'MATCH_MEANING', 'MATCH_IPA'), (86, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (87, 'pharmacy', '/ˈfɑː.mə.si/', NULL, '/vocab/pharmacy.webp', 'A2', 'Hiệu thuốc, nhà thuốc', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (87, 'A shop where medicines are prepared and sold.', 'Hiệu thuốc, nhà thuốc', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (87, 'I stopped by the pharmacy to pick up some throat lozenges.', 'Tôi ghé hiệu thuốc mua ít viên ngậm đau họng.', NULL),
(87, 'Is there a twenty-four-hour pharmacy near here?', 'Gần đây có nhà thuốc nào mở cửa 24 giờ không?', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (87, 'MATCH_MEANING', 'MATCH_MEANING'), (87, 'MATCH_MEANING', 'MATCH_IPA'), (87, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (88, 'bandage', '/ˈbæn.dɪdʒ/', NULL, '/vocab/bandage.webp', 'A2', 'Băng gạc y tế', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (88, 'A strip of cloth wrapped around a wound or injury to protect it.', 'Băng gạc y tế', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (88, 'The nurse cleaned the cut and put a fresh bandage on it.', 'Y tá rửa sạch vết cắt và băng lại bằng gạc mới.', NULL),
(88, 'Always pack a few bandages in your first-aid kit.', 'Luôn chuẩn bị sẵn vài miếng băng gạc trong hộp sơ cứu.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (88, 'MATCH_MEANING', 'MATCH_MEANING'), (88, 'MATCH_MEANING', 'MATCH_IPA'), (88, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (89, 'vitamin', '/ˈvɪt.ə.mɪn/', NULL, '/vocab/vitamin.webp', 'A2', 'Vitamin', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (89, 'A natural substance in food that the body needs to stay healthy.', 'Vitamin', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (89, 'Citrus fruits like oranges are rich in vitamin C.', 'Các loại trái cây họ cam quýt rất giàu vitamin C.', NULL),
(89, 'Sunlight helps your body produce vitamin D naturally.', 'Ánh nắng giúp cơ thể tự tổng hợp vitamin D một cách tự nhiên.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (89, 'MATCH_MEANING', 'MATCH_MEANING'), (89, 'MATCH_MEANING', 'MATCH_IPA'), (89, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (90, 'headache', '/ˈhed.eɪk/', NULL, '/vocab/headache.webp', 'A2', 'Cơn đau đầu', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (90, 'A continuous pain in the head.', 'Cơn đau đầu', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (90, 'Staring at a screen all day gave me a mild headache.', 'Nhìn màn hình cả ngày khiến tôi bị đau đầu nhẹ.', NULL),
(90, 'Drinking water and resting in a quiet room eased her headache.', 'Uống nước và nghỉ trong phòng yên tĩnh giúp cô ấy đỡ đau đầu.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (90, 'MATCH_MEANING', 'MATCH_MEANING'), (90, 'MATCH_MEANING', 'MATCH_IPA'), (90, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (91, 'fever', '/ˈfiː.vər/', NULL, '/vocab/fever.webp', 'A2', 'Cơn sốt', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (91, 'A medical condition in which body temperature is higher than normal.', 'Cơn sốt', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (91, 'The child had a high fever last night, so we called the clinic.', 'Đứa bé sốt cao tối qua nên chúng tôi đã gọi cho phòng khám.', NULL),
(91, 'Use a thermometer to check if your fever is going down.', 'Dùng nhiệt kế để kiểm tra xem cơn sốt đã hạ chưa.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (91, 'MATCH_MEANING', 'MATCH_MEANING'), (91, 'MATCH_MEANING', 'MATCH_IPA'), (91, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (92, 'appointment', '/əˈpɔɪnt.mənt/', NULL, '/vocab/appointment.webp', 'A2', 'Lịch hẹn (khám bệnh/công việc)', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (92, 'A formal arrangement to meet someone at a fixed time.', 'Lịch hẹn (khám bệnh/công việc)', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (92, 'I booked a dental appointment for next Tuesday morning.', 'Tôi đặt lịch hẹn nha khoa vào sáng thứ Ba tuần tới.', NULL),
(92, 'Please arrive ten minutes early for your clinic appointment.', 'Vui lòng đến sớm mười phút cho lịch hẹn tại phòng khám.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (92, 'MATCH_MEANING', 'MATCH_MEANING'), (92, 'MATCH_MEANING', 'MATCH_IPA'), (92, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (93, 'clinic', '/ˈklɪn.ɪk/', NULL, '/vocab/clinic.webp', 'A2', 'Phòng khám', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (93, 'A place where people go for medical advice or treatment.', 'Phòng khám', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (93, 'The local health clinic offers free annual check-ups.', 'Phòng khám địa phương cung cấp khám sức khỏe định kỳ miễn phí.', NULL),
(93, 'She visited the sports clinic for her ankle injury.', 'Cô ấy đến phòng khám thể thao để kiểm tra chấn thương mắt cá chân.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (93, 'MATCH_MEANING', 'MATCH_MEANING'), (93, 'MATCH_MEANING', 'MATCH_IPA'), (93, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (94, 'stretching', '/ˈstretʃ.ɪŋ/', NULL, '/vocab/stretching.webp', 'B1', 'Động tác giãn cơ', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (94, 'The act of extending muscles to improve flexibility and prevent injury.', 'Động tác giãn cơ', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (94, 'Five minutes of stretching before a run prevents muscle cramps.', 'Năm phút giãn cơ trước khi chạy giúp tránh chuột rút.', NULL),
(94, 'Gentle stretching at your desk relieves neck tension.', 'Giãn cơ nhẹ tại bàn làm việc giúp giảm mỏi cổ.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (94, 'MATCH_MEANING', 'MATCH_MEANING'), (94, 'MATCH_MEANING', 'MATCH_IPA'), (94, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (95, 'hydration', '/haɪˈdreɪ.ʃən/', NULL, '/vocab/hydration.webp', 'B1', 'Sự cấp nước, giữ đủ nước cho cơ thể', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (95, 'The process of supplying enough water to the body.', 'Sự cấp nước, giữ đủ nước cho cơ thể', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (95, 'Proper hydration is vital when exercising in hot weather.', 'Cấp nước đầy đủ rất quan trọng khi tập luyện trong thời tiết nóng.', NULL),
(95, 'Carrying a reusable bottle reminds me to maintain hydration.', 'Mang theo bình nước tái sử dụng nhắc tôi duy trì uống đủ nước.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (95, 'MATCH_MEANING', 'MATCH_MEANING'), (95, 'MATCH_MEANING', 'MATCH_IPA'), (95, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (96, 'recovery', '/rɪˈkʌv.ər.i/', NULL, '/vocab/recovery.webp', 'B1', 'Sự hồi phục', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (96, 'The process of becoming well again after an illness or injury.', 'Sự hồi phục', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (96, 'Good sleep and nutrition speed up muscle recovery.', 'Giấc ngủ ngon và dinh dưỡng tốt giúp đẩy nhanh quá trình hồi phục cơ.', NULL),
(96, 'We wish you a smooth and speedy recovery.', 'Chúc bạn hồi phục thuận lợi và nhanh chóng.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (96, 'MATCH_MEANING', 'MATCH_MEANING'), (96, 'MATCH_MEANING', 'MATCH_IPA'), (96, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (97, 'balance', '/ˈbæl.əns/', NULL, '/vocab/balance.webp', 'B1', 'Sự cân bằng', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (97, 'A state in which different things exist in the right proportions.', 'Sự cân bằng', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (97, 'Finding a healthy work-life balance reduces burnout.', 'Tìm được sự cân bằng lành mạnh giữa công việc và cuộc sống giúp giảm kiệt sức.', NULL),
(97, 'Cycling requires steady balance and focus.', 'Đạp xe đòi hỏi sự cân bằng vững vàng và tập trung.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (97, 'MATCH_MEANING', 'MATCH_MEANING'), (97, 'MATCH_MEANING', 'MATCH_IPA'), (97, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (98, 'posture', '/ˈpɒs.tʃər/', NULL, '/vocab/posture.webp', 'B1', 'Tư thế (ngồi, đứng)', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (98, 'The position in which you hold your body when standing or sitting.', 'Tư thế (ngồi, đứng)', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (98, 'An ergonomic chair encourages better sitting posture.', 'Một chiếc ghế công thái học hỗ trợ tư thế ngồi tốt hơn.', NULL),
(98, 'Good posture prevents back pain during long study sessions.', 'Tư thế đúng giúp phòng tránh đau lưng khi học tập trong thời gian dài.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (98, 'MATCH_MEANING', 'MATCH_MEANING'), (98, 'MATCH_MEANING', 'MATCH_IPA'), (98, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (99, 'stamina', '/ˈstæm.ɪ.nə/', NULL, '/vocab/stamina.webp', 'B1', 'Sức bền, thể lực', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (99, 'The physical or mental strength to keep doing something for a long time.', 'Sức bền, thể lực', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (99, 'Regular cycling gradually builds your cardiovascular stamina.', 'Đạp xe đều đặn giúp xây dựng sức bền tim mạch theo thời gian.', NULL),
(99, 'Running a half-marathon tests both speed and stamina.', 'Chạy bán marathon thử thách cả tốc độ lẫn sức bền.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (99, 'MATCH_MEANING', 'MATCH_MEANING'), (99, 'MATCH_MEANING', 'MATCH_IPA'), (99, 'FILLING', NULL);
INSERT INTO vocabulary (vocab_id, word, ipa, audio_url, image_url, level, meaning_vi, topic_id) VALUES (100, 'meditation', '/ˌmed.ɪˈteɪ.ʃən/', NULL, '/vocab/meditation.webp', 'B1', 'Thiền định', 7);
INSERT INTO meaning (vocab_id, meaning_en, meaning_vi, type) VALUES (100, 'The practice of focusing your mind calmly to achieve mental clarity.', 'Thiền định', 'noun');
INSERT INTO example (vocab_id, sentence, translation, audio_url) VALUES (100, 'Ten minutes of daily meditation helps calm a busy mind.', 'Mười phút thiền mỗi ngày giúp xoa dịu tâm trí bận rộn.', NULL),
(100, 'She uses guided meditation before bed to unwind.', 'Cô ấy nghe thiền có hướng dẫn trước khi ngủ để thư giãn.', NULL);
INSERT INTO exercise (vocab_id, exercise_type, match_mode) VALUES (100, 'MATCH_MEANING', 'MATCH_MEANING'), (100, 'MATCH_MEANING', 'MATCH_IPA'), (100, 'FILLING', NULL);

-- 4. Sync PostgreSQL IDENTITY sequences
SELECT setval(pg_get_serial_sequence('topic', 'topic_id'), COALESCE((SELECT MAX(topic_id) FROM topic), 1), TRUE);
SELECT setval(pg_get_serial_sequence('vocabulary', 'vocab_id'), COALESCE((SELECT MAX(vocab_id) FROM vocabulary), 1), TRUE);
SELECT setval(pg_get_serial_sequence('meaning', 'meaning_id'), COALESCE((SELECT MAX(meaning_id) FROM meaning), 1), TRUE);
SELECT setval(pg_get_serial_sequence('example', 'example_id'), COALESCE((SELECT MAX(example_id) FROM example), 1), TRUE);
SELECT setval(pg_get_serial_sequence('exercise', 'exercise_id'), COALESCE((SELECT MAX(exercise_id) FROM exercise), 1), TRUE);

COMMIT;
