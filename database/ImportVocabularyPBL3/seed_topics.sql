USE PBL3;
GO

-- 1. (Optional) Clear existing data for a clean seed to prevent duplicates

-- 2. Insert Parent Topics
INSERT INTO topic (name, description, parent_topic_id) VALUES
(N'Daily Communication', N'Common vocabulary and expressions used in everyday conversations, greetings, shopping, and basic interactions.', NULL),
(N'Work and Education', N'Vocabulary related to jobs, workplaces, school life, studying, meetings, and professional communication.', NULL),
(N'Health', N'Words and expressions about the human body, illnesses, healthy habits, exercise, and medical situations.', NULL),
(N'Entertainment and Travel', N'Vocabulary for movies, music, traveling, hotels, sightseeing, and leisure activities.', NULL),
(N'Daily Life', N'Common words used in daily routines, food, transportation, shopping, household activities, and lifestyle.', NULL),
(N'Emotions and Opinions', N'Vocabulary used to express feelings, emotions, personal opinions, preferences, and future plans.', NULL),
(N'Culture and Science', N'Words related to culture, history, nature, science, technology, and understanding the world.', NULL);

-- 3. Declare variables and gather IDs in the same batch
DECLARE
    @DailyCommunicationId BIGINT,
    @WorkEducationId BIGINT,
    @HealthId BIGINT,
    @EntertainmentTravelId BIGINT,
    @DailyLifeId BIGINT,
    @EmotionsOpinionsId BIGINT,
    @CultureScienceId BIGINT;

SELECT @DailyCommunicationId = topic_id FROM topic WHERE name = N'Daily Communication';
SELECT @WorkEducationId = topic_id FROM topic WHERE name = N'Work and Education';
SELECT @HealthId = topic_id FROM topic WHERE name = N'Health';
SELECT @EntertainmentTravelId = topic_id FROM topic WHERE name = N'Entertainment and Travel';
SELECT @DailyLifeId = topic_id FROM topic WHERE name = N'Daily Life';
SELECT @EmotionsOpinionsId = topic_id FROM topic WHERE name = N'Emotions and Opinions';
SELECT @CultureScienceId = topic_id FROM topic WHERE name = N'Culture and Science';

-- 4. Insert Subcategories using the declared variables
INSERT INTO topic (name, description, parent_topic_id) VALUES
(N'Greetings and Introductions', N'Expressions for greeting people and introducing oneself.', @DailyCommunicationId),
(N'Family', N'Vocabulary related to family members and relationships.', @DailyCommunicationId),
(N'Friends and Relationships', N'Words used to describe friendships and social relationships.', @DailyCommunicationId),
(N'Weather', N'Common words and phrases for talking about the weather.', @DailyCommunicationId),
(N'Numbers and Dates', N'Vocabulary related to numbers, dates, months, and years.', @DailyCommunicationId),
(N'Colors', N'Common vocabulary for colors and color descriptions.', @DailyCommunicationId),
(N'Household Items', N'Words for common items used at home.', @DailyCommunicationId),
(N'Asking for and Giving Directions', N'Expressions used to ask for and give directions.', @DailyCommunicationId),
(N'Shopping', N'Vocabulary used when buying goods and asking about prices.', @DailyCommunicationId),
(N'Ordering Food', N'Expressions used when ordering food in restaurants or cafes.', @DailyCommunicationId);

--SUBCATEGORY – WORK AND EDUCATION

INSERT INTO topic (name, description, parent_topic_id) VALUES
(N'Jobs and Occupations', N'Vocabulary related to different jobs and professions.', @WorkEducationId),
(N'Office', N'Common words used in office environments.', @WorkEducationId),
(N'School and Education', N'Vocabulary related to school life and studying.', @WorkEducationId),
(N'Basic Email Communication', N'Common phrases used in basic work or study emails.', @WorkEducationId),
(N'Daily Tasks at Work', N'Vocabulary for daily work tasks and responsibilities.', @WorkEducationId),
(N'Team Meetings', N'Vocabulary used in meetings and group discussions.', @WorkEducationId),
(N'Schedules and Time', N'Words and expressions related to schedules and time management.', @WorkEducationId),
(N'Office Equipment', N'Vocabulary for common office machines and equipment.', @WorkEducationId),
(N'Colleagues', N'Words used to describe coworkers and workplace relationships.', @WorkEducationId);

--SUBCATEGORY – HEALTH
INSERT INTO topic (name, description, parent_topic_id) VALUES
(N'Body Parts', N'Vocabulary for different parts of the human body.', @HealthId),
(N'Illnesses and Health', N'Words used to describe illnesses and health conditions.', @HealthId),
(N'Exercise and Sports', N'Vocabulary related to physical activities and sports.', @HealthId),
(N'Healthy Habits', N'Words and expressions about healthy daily habits.', @HealthId),
(N'Diet and Nutrition', N'Vocabulary related to food, diet, and nutrition.', @HealthId);

--SUBCATEGORY – ENTERTAINMENT AND TRAVEL
INSERT INTO topic (name, description, parent_topic_id) VALUES
(N'Movies and Music', N'Vocabulary related to movies, music, and entertainment.', @EntertainmentTravelId),
(N'Travel and Exploration', N'Words used for traveling and exploring new places.', @EntertainmentTravelId),
(N'Famous Places', N'Vocabulary related to famous landmarks and popular destinations.', @EntertainmentTravelId),
(N'Hotels and Accommodation', N'Common vocabulary for hotels and places to stay.', @EntertainmentTravelId),
(N'Outdoor Activities', N'Vocabulary related to outdoor and leisure activities.', @EntertainmentTravelId);

--SUBCATEGORY – DAILY LIFE
INSERT INTO topic (name, description, parent_topic_id) VALUES
(N'Food and Drinks', N'Common words for food, drinks, and meals.', @DailyLifeId),
(N'Supermarket', N'Vocabulary used when shopping in supermarkets.', @DailyLifeId),
(N'Transportation', N'Vocabulary related to transportation and travel methods.', @DailyLifeId),
(N'Pets and Animals', N'Common words for pets and animals.', @DailyLifeId),
(N'Leisure Time', N'Vocabulary related to free time and relaxation activities.', @DailyLifeId),
(N'Clothing and Shopping', N'Words related to clothes, fashion, and shopping.', @DailyLifeId),
(N'Daily Routines', N'Words used to describe everyday activities and routines.', @DailyLifeId),
(N'Kitchen and Cooking', N'Vocabulary used in the kitchen and cooking activities.', @DailyLifeId),
(N'House Cleaning', N'Words and expressions related to cleaning and household chores.', @DailyLifeId),
(N'Technology and Internet', N'Common words related to technology and the internet.', @DailyLifeId);

--SUBCATEGORY – EMOTIONS AND OPINIONS
INSERT INTO topic (name, description, parent_topic_id) VALUES
(N'Feelings and Emotions', N'Vocabulary used to express emotions and feelings.', @EmotionsOpinionsId),
(N'Hobbies', N'Words related to hobbies and free-time activities.', @EmotionsOpinionsId),
(N'Personal Opinions', N'Expressions used to give personal opinions and viewpoints.', @EmotionsOpinionsId),
(N'Future Plans', N'Vocabulary used to talk about future intentions and plans.', @EmotionsOpinionsId),
(N'Festivals and Events', N'Vocabulary related to festivals and special events.', @EmotionsOpinionsId);

--SUBCATEGORY – CULTURE AND SCIENCE
INSERT INTO topic (name, description, parent_topic_id) VALUES
(N'Nature and Environment', N'Vocabulary related to nature and the environment.', @CultureScienceId),
(N'Wildlife', N'Words related to animals and wildlife.', @CultureScienceId),
(N'Books and Literature', N'Vocabulary used when talking about books and literature.', @CultureScienceId),
(N'History and Culture', N'Words related to history, culture, and society.', @CultureScienceId),
(N'Traditions and Customs', N'Vocabulary related to traditions and customs.', @CultureScienceId),
(N'Holidays around the World', N'Vocabulary related to major holidays and celebrations from different countries and cultures around the world.',@CultureScienceId);