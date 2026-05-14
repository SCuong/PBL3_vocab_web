-- PostgreSQL seed topics.
-- Idempotent: exits immediately if topic table already has rows.
-- Topics are also seeded by database/postgres/init.sql — run this only for standalone seeding.

DO $$
DECLARE
    _DailyCommunicationId   BIGINT;
    _WorkEducationId        BIGINT;
    _HealthId               BIGINT;
    _EntertainmentTravelId  BIGINT;
    _DailyLifeId            BIGINT;
    _EmotionsOpinionsId     BIGINT;
    _CultureScienceId       BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM topic) THEN
        RETURN;
    END IF;

    -- Parent topics
    INSERT INTO topic (name, description, parent_topic_id) VALUES
    ('Daily Communication',     'Common vocabulary and expressions used in everyday conversations, greetings, shopping, and basic interactions.', NULL),
    ('Work and Education',      'Vocabulary related to jobs, workplaces, school life, studying, meetings, and professional communication.',       NULL),
    ('Health',                  'Words and expressions about the human body, illnesses, healthy habits, exercise, and medical situations.',        NULL),
    ('Entertainment and Travel','Vocabulary for movies, music, traveling, hotels, sightseeing, and leisure activities.',                           NULL),
    ('Daily Life',              'Common words used in daily routines, food, transportation, shopping, household activities, and lifestyle.',        NULL),
    ('Emotions and Opinions',   'Vocabulary used to express feelings, emotions, personal opinions, preferences, and future plans.',                NULL),
    ('Culture and Science',     'Words related to culture, history, nature, science, technology, and understanding the world.',                    NULL);

    SELECT topic_id INTO _DailyCommunicationId  FROM topic WHERE name = 'Daily Communication';
    SELECT topic_id INTO _WorkEducationId        FROM topic WHERE name = 'Work and Education';
    SELECT topic_id INTO _HealthId               FROM topic WHERE name = 'Health';
    SELECT topic_id INTO _EntertainmentTravelId  FROM topic WHERE name = 'Entertainment and Travel';
    SELECT topic_id INTO _DailyLifeId            FROM topic WHERE name = 'Daily Life';
    SELECT topic_id INTO _EmotionsOpinionsId     FROM topic WHERE name = 'Emotions and Opinions';
    SELECT topic_id INTO _CultureScienceId       FROM topic WHERE name = 'Culture and Science';

    -- SUBCATEGORY: DAILY COMMUNICATION
    INSERT INTO topic (name, description, parent_topic_id) VALUES
    ('Greetings and Introductions',     'Expressions for greeting people and introducing oneself.',          _DailyCommunicationId),
    ('Family',                          'Vocabulary related to family members and relationships.',            _DailyCommunicationId),
    ('Friends and Relationships',       'Words used to describe friendships and social relationships.',       _DailyCommunicationId),
    ('Weather',                         'Common words and phrases for talking about the weather.',            _DailyCommunicationId),
    ('Numbers and Dates',               'Vocabulary related to numbers, dates, months, and years.',           _DailyCommunicationId),
    ('Colors',                          'Common vocabulary for colors and color descriptions.',               _DailyCommunicationId),
    ('Household Items',                 'Words for common items used at home.',                               _DailyCommunicationId),
    ('Asking for and Giving Directions','Expressions used to ask for and give directions.',                   _DailyCommunicationId),
    ('Shopping',                        'Vocabulary used when buying goods and asking about prices.',         _DailyCommunicationId),
    ('Ordering Food',                   'Expressions used when ordering food in restaurants or cafes.',       _DailyCommunicationId);

    -- SUBCATEGORY: WORK AND EDUCATION
    INSERT INTO topic (name, description, parent_topic_id) VALUES
    ('Jobs and Occupations',        'Vocabulary related to different jobs and professions.',                _WorkEducationId),
    ('Office',                      'Common words used in office environments.',                            _WorkEducationId),
    ('School and Education',        'Vocabulary related to school life and studying.',                      _WorkEducationId),
    ('Basic Email Communication',   'Common phrases used in basic work or study emails.',                   _WorkEducationId),
    ('Daily Tasks at Work',         'Vocabulary for daily work tasks and responsibilities.',                 _WorkEducationId),
    ('Team Meetings',               'Vocabulary used in meetings and group discussions.',                    _WorkEducationId),
    ('Schedules and Time',          'Words and expressions related to schedules and time management.',       _WorkEducationId),
    ('Office Equipment',            'Vocabulary for common office machines and equipment.',                  _WorkEducationId),
    ('Colleagues',                  'Words used to describe coworkers and workplace relationships.',         _WorkEducationId);

    -- SUBCATEGORY: HEALTH
    INSERT INTO topic (name, description, parent_topic_id) VALUES
    ('Body Parts',          'Vocabulary for different parts of the human body.',                  _HealthId),
    ('Illnesses and Health','Words used to describe illnesses and health conditions.',            _HealthId),
    ('Exercise and Sports', 'Vocabulary related to physical activities and sports.',              _HealthId),
    ('Healthy Habits',      'Words and expressions about healthy daily habits.',                  _HealthId),
    ('Diet and Nutrition',  'Vocabulary related to food, diet, and nutrition.',                   _HealthId);

    -- SUBCATEGORY: ENTERTAINMENT AND TRAVEL
    INSERT INTO topic (name, description, parent_topic_id) VALUES
    ('Movies and Music',        'Vocabulary related to movies, music, and entertainment.',                   _EntertainmentTravelId),
    ('Travel and Exploration',  'Words used for traveling and exploring new places.',                         _EntertainmentTravelId),
    ('Famous Places',           'Vocabulary related to famous landmarks and popular destinations.',           _EntertainmentTravelId),
    ('Hotels and Accommodation','Common vocabulary for hotels and places to stay.',                           _EntertainmentTravelId),
    ('Outdoor Activities',      'Vocabulary related to outdoor and leisure activities.',                      _EntertainmentTravelId);

    -- SUBCATEGORY: DAILY LIFE
    INSERT INTO topic (name, description, parent_topic_id) VALUES
    ('Food and Drinks',       'Common words for food, drinks, and meals.',                              _DailyLifeId),
    ('Supermarket',           'Vocabulary used when shopping in supermarkets.',                         _DailyLifeId),
    ('Transportation',        'Vocabulary related to transportation and travel methods.',               _DailyLifeId),
    ('Pets and Animals',      'Common words for pets and animals.',                                     _DailyLifeId),
    ('Leisure Time',          'Vocabulary related to free time and relaxation activities.',             _DailyLifeId),
    ('Clothing and Shopping', 'Words related to clothes, fashion, and shopping.',                       _DailyLifeId),
    ('Daily Routines',        'Words used to describe everyday activities and routines.',               _DailyLifeId),
    ('Kitchen and Cooking',   'Vocabulary used in the kitchen and cooking activities.',                 _DailyLifeId),
    ('House Cleaning',        'Words and expressions related to cleaning and household chores.',        _DailyLifeId),
    ('Technology and Internet','Common words related to technology and the internet.',                  _DailyLifeId);

    -- SUBCATEGORY: EMOTIONS AND OPINIONS
    INSERT INTO topic (name, description, parent_topic_id) VALUES
    ('Feelings and Emotions','Vocabulary used to express emotions and feelings.',                   _EmotionsOpinionsId),
    ('Hobbies',              'Words related to hobbies and free-time activities.',                   _EmotionsOpinionsId),
    ('Personal Opinions',    'Expressions used to give personal opinions and viewpoints.',           _EmotionsOpinionsId),
    ('Future Plans',         'Vocabulary used to talk about future intentions and plans.',           _EmotionsOpinionsId),
    ('Festivals and Events', 'Vocabulary related to festivals and special events.',                  _EmotionsOpinionsId);

    -- SUBCATEGORY: CULTURE AND SCIENCE
    INSERT INTO topic (name, description, parent_topic_id) VALUES
    ('Nature and Environment',  'Vocabulary related to nature and the environment.',                         _CultureScienceId),
    ('Wildlife',                'Words related to animals and wildlife.',                                     _CultureScienceId),
    ('Books and Literature',    'Vocabulary used when talking about books and literature.',                   _CultureScienceId),
    ('History and Culture',     'Words related to history, culture, and society.',                            _CultureScienceId),
    ('Traditions and Customs',  'Vocabulary related to traditions and customs.',                              _CultureScienceId),
    ('Holidays around the World','Vocabulary related to major holidays and celebrations from different countries and cultures around the world.', _CultureScienceId);
END;
$$;
