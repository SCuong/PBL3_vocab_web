IF OBJECT_ID(N'dbo.[users]', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[users]
    (
        [user_id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [username] NVARCHAR(50) UNIQUE NOT NULL,
        [email] NVARCHAR(100) UNIQUE NOT NULL,
        [password_hash] NVARCHAR(255) NOT NULL,
        [role] NVARCHAR(20) CHECK ([role] IN ('ADMIN', 'LEARNER')) NOT NULL,
        [status] NVARCHAR(20) CHECK ([status] IN ('ACTIVE', 'BLOCKED')) NOT NULL,
        [created_at] DATETIME DEFAULT (GETDATE()) NOT NULL
    );
END
GO

IF OBJECT_ID(N'dbo.[topic]', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[topic]
    (
        [topic_id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [name] NVARCHAR(100) UNIQUE NOT NULL,
        [description] NVARCHAR(MAX),
        [parent_topic_id] BIGINT FOREIGN KEY REFERENCES dbo.[topic] ([topic_id])
    );
END
GO

IF OBJECT_ID(N'dbo.[vocabulary]', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[vocabulary]
    (
        [vocab_id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [word] NVARCHAR(100) NOT NULL,
        [ipa] NVARCHAR(100),
        [audio_url] NVARCHAR(255),
        [meaning_vi] NVARCHAR(MAX) NOT NULL,
        [topic_id] BIGINT NOT NULL,
        [level] NVARCHAR(10) CHECK ([level] IN ('A1', 'A2', 'B1', 'B2', 'C1')) NOT NULL,
        FOREIGN KEY ([topic_id]) REFERENCES dbo.[topic] ([topic_id])
    );
END
GO

IF OBJECT_ID(N'dbo.[user_vocabulary]', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[user_vocabulary]
    (
        [user_id] BIGINT NOT NULL,
        [vocab_id] BIGINT NOT NULL,
        [status] NVARCHAR(20) DEFAULT ('NEW') CHECK ([status] IN ('NEW', 'LEARNING', 'MASTERED')) NOT NULL,
        [note] NVARCHAR(MAX),
        [first_learned_date] DATE,
        PRIMARY KEY ([user_id], [vocab_id]),
        FOREIGN KEY ([user_id]) REFERENCES dbo.[users] ([user_id]) ON DELETE CASCADE,
        FOREIGN KEY ([vocab_id]) REFERENCES dbo.[vocabulary] ([vocab_id]) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID(N'dbo.[example]', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[example]
    (
        [example_id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [vocab_id] BIGINT NOT NULL,
        [sentence] NVARCHAR(MAX) NOT NULL,
        [translation] NVARCHAR(MAX),
        [audio_url] NVARCHAR(255),
        FOREIGN KEY ([vocab_id]) REFERENCES dbo.[vocabulary] ([vocab_id]) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID(N'dbo.[progress]', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[progress]
    (
        [user_id] BIGINT NOT NULL,
        [vocab_id] BIGINT NOT NULL,
        [last_review_date] DATE,
        [next_review_date] DATE,
        PRIMARY KEY ([user_id], [vocab_id]),
        FOREIGN KEY ([user_id], [vocab_id]) REFERENCES dbo.[user_vocabulary] ([user_id], [vocab_id]) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID(N'dbo.[learning_log]', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[learning_log]
    (
        [log_id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [user_id] BIGINT NOT NULL,
        [date] DATE NOT NULL,
        [activity_type] NVARCHAR(20) CHECK ([activity_type] IN ('LEARN', 'REVIEW', 'GAME')) NOT NULL,
        [score] INT,
        FOREIGN KEY ([user_id]) REFERENCES dbo.[users] ([user_id]) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID(N'dbo.[exercise]', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[exercise]
    (
        [exercise_id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [vocab_id] BIGINT NOT NULL,
        [exercise_type] NVARCHAR(30) CHECK ([exercise_type] IN ('READING', 'LISTEN_CHOOSE_MEANING', 'MATCH_IPA')) NOT NULL,
        [created_at] DATETIME DEFAULT (GETDATE()),
        FOREIGN KEY ([vocab_id]) REFERENCES dbo.[vocabulary] ([vocab_id]) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID(N'dbo.[exercise_result]', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[exercise_result]
    (
        [result_id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [exercise_id] BIGINT NOT NULL,
        [user_id] BIGINT NOT NULL,
        [is_correct] BIT NOT NULL,
        [answered_at] DATETIME DEFAULT (GETDATE()),
        FOREIGN KEY ([exercise_id]) REFERENCES dbo.[exercise] ([exercise_id]) ON DELETE CASCADE,
        FOREIGN KEY ([user_id]) REFERENCES dbo.[users] ([user_id]) ON DELETE CASCADE
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.[topic])
BEGIN
    INSERT INTO dbo.[topic] ([name], [description], [parent_topic_id])
    VALUES
        (N'Daily Communication', N'Common vocabulary and expressions used in everyday conversations, greetings, shopping, and basic interactions.', NULL),
        (N'Work and Education', N'Vocabulary related to jobs, workplaces, school life, studying, meetings, and professional communication.', NULL),
        (N'Health', N'Words and expressions about the human body, illnesses, healthy habits, exercise, and medical situations.', NULL),
        (N'Entertainment and Travel', N'Vocabulary for movies, music, traveling, hotels, sightseeing, and leisure activities.', NULL),
        (N'Daily Life', N'Common words used in daily routines, food, transportation, shopping, household activities, and lifestyle.', NULL),
        (N'Emotions and Opinions', N'Vocabulary used to express feelings, emotions, personal opinions, preferences, and future plans.', NULL),
        (N'Culture and Science', N'Words related to culture, history, nature, science, technology, and understanding the world.', NULL);

    DECLARE
        @DailyCommunicationId BIGINT,
        @WorkEducationId BIGINT,
        @HealthId BIGINT,
        @EntertainmentTravelId BIGINT,
        @DailyLifeId BIGINT,
        @EmotionsOpinionsId BIGINT,
        @CultureScienceId BIGINT;

    SELECT @DailyCommunicationId = [topic_id] FROM dbo.[topic] WHERE [name] = N'Daily Communication';
    SELECT @WorkEducationId = [topic_id] FROM dbo.[topic] WHERE [name] = N'Work and Education';
    SELECT @HealthId = [topic_id] FROM dbo.[topic] WHERE [name] = N'Health';
    SELECT @EntertainmentTravelId = [topic_id] FROM dbo.[topic] WHERE [name] = N'Entertainment and Travel';
    SELECT @DailyLifeId = [topic_id] FROM dbo.[topic] WHERE [name] = N'Daily Life';
    SELECT @EmotionsOpinionsId = [topic_id] FROM dbo.[topic] WHERE [name] = N'Emotions and Opinions';
    SELECT @CultureScienceId = [topic_id] FROM dbo.[topic] WHERE [name] = N'Culture and Science';

    INSERT INTO dbo.[topic] ([name], [description], [parent_topic_id])
    VALUES
        (N'Greetings and Introductions', N'Expressions for greeting people and introducing oneself.', @DailyCommunicationId),
        (N'Family', N'Vocabulary related to family members and relationships.', @DailyCommunicationId),
        (N'Friends and Relationships', N'Words used to describe friendships and social relationships.', @DailyCommunicationId),
        (N'Weather', N'Common words and phrases for talking about the weather.', @DailyCommunicationId),
        (N'Numbers and Dates', N'Vocabulary related to numbers, dates, months, and years.', @DailyCommunicationId),
        (N'Colors', N'Common vocabulary for colors and color descriptions.', @DailyCommunicationId),
        (N'Household Items', N'Words for common items used at home.', @DailyCommunicationId),
        (N'Asking for and Giving Directions', N'Expressions used to ask for and give directions.', @DailyCommunicationId),
        (N'Shopping', N'Vocabulary used when buying goods and asking about prices.', @DailyCommunicationId),
        (N'Ordering Food', N'Expressions used when ordering food in restaurants or cafes.', @DailyCommunicationId),
        (N'Jobs and Occupations', N'Vocabulary related to different jobs and professions.', @WorkEducationId),
        (N'Office', N'Common words used in office environments.', @WorkEducationId),
        (N'School and Education', N'Vocabulary related to school life and studying.', @WorkEducationId),
        (N'Basic Email Communication', N'Common phrases used in basic work or study emails.', @WorkEducationId),
        (N'Daily Tasks at Work', N'Vocabulary for daily work tasks and responsibilities.', @WorkEducationId),
        (N'Team Meetings', N'Vocabulary used in meetings and group discussions.', @WorkEducationId),
        (N'Schedules and Time', N'Words and expressions related to schedules and time management.', @WorkEducationId),
        (N'Office Equipment', N'Vocabulary for common office machines and equipment.', @WorkEducationId),
        (N'Colleagues', N'Words used to describe coworkers and workplace relationships.', @WorkEducationId),
        (N'Body Parts', N'Vocabulary for different parts of the human body.', @HealthId),
        (N'Illnesses and Health', N'Words used to describe illnesses and health conditions.', @HealthId),
        (N'Exercise and Sports', N'Vocabulary related to physical activities and sports.', @HealthId),
        (N'Healthy Habits', N'Words and expressions about healthy daily habits.', @HealthId),
        (N'Diet and Nutrition', N'Vocabulary related to food, diet, and nutrition.', @HealthId),
        (N'Movies and Music', N'Vocabulary related to movies, music, and entertainment.', @EntertainmentTravelId),
        (N'Travel and Exploration', N'Words used for traveling and exploring new places.', @EntertainmentTravelId),
        (N'Famous Places', N'Vocabulary related to famous landmarks and popular destinations.', @EntertainmentTravelId),
        (N'Hotels and Accommodation', N'Common vocabulary for hotels and places to stay.', @EntertainmentTravelId),
        (N'Outdoor Activities', N'Vocabulary related to outdoor and leisure activities.', @EntertainmentTravelId),
        (N'Food and Drinks', N'Common words for food, drinks, and meals.', @DailyLifeId),
        (N'Supermarket', N'Vocabulary used when shopping in supermarkets.', @DailyLifeId),
        (N'Transportation', N'Vocabulary related to transportation and travel methods.', @DailyLifeId),
        (N'Pets and Animals', N'Common words for pets and animals.', @DailyLifeId),
        (N'Leisure Time', N'Vocabulary related to free time and relaxation activities.', @DailyLifeId),
        (N'Clothing and Shopping', N'Words related to clothes, fashion, and shopping.', @DailyLifeId),
        (N'Daily Routines', N'Words used to describe everyday activities and routines.', @DailyLifeId),
        (N'Kitchen and Cooking', N'Vocabulary used in the kitchen and cooking activities.', @DailyLifeId),
        (N'House Cleaning', N'Words and expressions related to cleaning and household chores.', @DailyLifeId),
        (N'Technology and Internet', N'Common words related to technology and the internet.', @DailyLifeId),
        (N'Feelings and Emotions', N'Vocabulary used to express emotions and feelings.', @EmotionsOpinionsId),
        (N'Hobbies', N'Words related to hobbies and free-time activities.', @EmotionsOpinionsId),
        (N'Personal Opinions', N'Expressions used to give personal opinions and viewpoints.', @EmotionsOpinionsId),
        (N'Future Plans', N'Vocabulary used to talk about future intentions and plans.', @EmotionsOpinionsId),
        (N'Festivals and Events', N'Vocabulary related to festivals and special events.', @EmotionsOpinionsId),
        (N'Nature and Environment', N'Vocabulary related to nature and the environment.', @CultureScienceId),
        (N'Wildlife', N'Words related to animals and wildlife.', @CultureScienceId),
        (N'Books and Literature', N'Vocabulary used when talking about books and literature.', @CultureScienceId),
        (N'History and Culture', N'Words related to history, culture, and society.', @CultureScienceId),
        (N'Traditions and Customs', N'Vocabulary related to traditions and customs.', @CultureScienceId),
        (N'Holidays around the World', N'Vocabulary related to major holidays and celebrations from different countries and cultures around the world.', @CultureScienceId);
END
GO
