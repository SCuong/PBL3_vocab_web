USE [PBL3]

GO
SET IDENTITY_INSERT [dbo].[topic] ON 

INSERT [dbo].[topic] ([topic_id], [name], [description], [parent_topic_id]) VALUES (1, N'Daily Communication', N'Common vocabulary and expressions used in everyday conversations, greetings, shopping, and basic interactions.', NULL)
INSERT [dbo].[topic] ([topic_id], [name], [description], [parent_topic_id]) VALUES (8, N'Greetings and Introductions', N'Expressions for greeting people and introducing oneself.', 1)
INSERT [dbo].[topic] ([topic_id], [name], [description], [parent_topic_id]) VALUES (11, N'Weather', N'Common words and phrases for talking about the weather.', 1)

SET IDENTITY_INSERT [dbo].[topic] OFF
GO
SET IDENTITY_INSERT [dbo].[vocabulary] ON 

INSERT [dbo].[vocabulary] ([vocab_id], [word], [ipa], [audio_url], [meaning_vi], [topic_id], [level]) VALUES (1, N'Hello', N'/həˈləʊ/', N'https://api.dictionaryapi.dev/media/pronunciations/en/hello-au.mp3', N'Xin chào', 8, N'A1')
INSERT [dbo].[vocabulary] ([vocab_id], [word], [ipa], [audio_url], [meaning_vi], [topic_id], [level]) VALUES (2, N'Hi', N'/haɪ/', N'https://api.dictionaryapi.dev/media/pronunciations/en/hi-1-uk.mp3', N'Chào', 8, N'A1')
INSERT [dbo].[vocabulary] ([vocab_id], [word], [ipa], [audio_url], [meaning_vi], [topic_id], [level]) VALUES (3, N'Good Morning', N'/ˌgʊd ˈmɔː.nɪŋ/', N'https://api.dictionaryapi.dev/media/pronunciations/en/good%20morning-uk.mp3', N'Chào buổi sáng', 8, N'A1')
GO
INSERT [dbo].[vocabulary] ([vocab_id], [word], [ipa], [audio_url], [meaning_vi], [topic_id], [level]) VALUES (88, N'Cloudy', N'/ˈklaʊːdɪ/', N'https://api.dictionaryapi.dev/media/pronunciations/en/cloudy-us.mp3', N'Có mây', 11, N'A1')
INSERT [dbo].[vocabulary] ([vocab_id], [word], [ipa], [audio_url], [meaning_vi], [topic_id], [level]) VALUES (89, N'Windy', N'/ˈwɪndi/', N'https://api.dictionaryapi.dev/media/pronunciations/en/windy-1-au.mp3', N'Có gió', 11, N'A2')
INSERT [dbo].[vocabulary] ([vocab_id], [word], [ipa], [audio_url], [meaning_vi], [topic_id], [level]) VALUES (90, N'Snowy', N'/snəʊi/', N'https://api.dictionaryapi.dev/media/pronunciations/en/snowy-us.mp3', N'Có tuyết', 11, N'A2')
SET IDENTITY_INSERT [dbo].[vocabulary] OFF
GO
SET IDENTITY_INSERT [dbo].[example] ON 

INSERT [dbo].[example] ([example_id], [vocab_id], [sentence], [translation], [audio_url]) VALUES (1, 1, N'Hello, how are you today?', N'Xin chào, hôm nay bạn thế nào?', N'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=en&q=Hello%2C%20how%20are%20you%20today%3F')
INSERT [dbo].[example] ([example_id], [vocab_id], [sentence], [translation], [audio_url]) VALUES (2, 2, N'Hi, it’s nice to meet you.', N'Chào, rất vui được gặp bạn.', N'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=en&q=Hi%2C%20it%E2%80%99s%20nice%20to%20meet%20you.')
INSERT [dbo].[example] ([example_id], [vocab_id], [sentence], [translation], [audio_url]) VALUES (3, 3, N'Good morning, I’m here for the meeting.', N'Chào buổi sáng, tôi đến đây để họp.', N'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=en&q=Good%20morning%2C%20I%E2%80%99m%20here%20for%20the%20meeting.')
GO
INSERT [dbo].[example] ([example_id], [vocab_id], [sentence], [translation], [audio_url]) VALUES (88, 88, N'It''s cloudy, it might rain later.', N'Trời có nhiều mây, lát nữa có thể sẽ mưa.', N'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=en&q=It%27s%20cloudy%2C%20it%20might%20rain%20later.')
INSERT [dbo].[example] ([example_id], [vocab_id], [sentence], [translation], [audio_url]) VALUES (89, 89, N'It''s too windy to play badminton.', N'Trời quá gió để chơi cầu lông.', N'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=en&q=It%27s%20too%20windy%20to%20play%20badminton.')
INSERT [dbo].[example] ([example_id], [vocab_id], [sentence], [translation], [audio_url]) VALUES (90, 90, N'We had a very snowy winter last year.', N'Năm ngoái chúng tôi đã có một mùa đông đầy tuyết.', N'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=en&q=We%20had%20a%20very%20snowy%20winter%20last%20year.')
SET IDENTITY_INSERT [dbo].[example] OFF