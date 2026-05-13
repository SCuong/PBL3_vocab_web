using Microsoft.EntityFrameworkCore;
using VocabLearning.Models;

namespace VocabLearning.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Users> Users { get; set; }
        public DbSet<Vocabulary> Vocabularies { get; set; }
        public DbSet<Example> Examples { get; set; }
        public DbSet<Topic> Topics { get; set; }
        public DbSet<UserVocabulary> UserVocabularies { get; set; }
        public DbSet<Progress> Progresses { get; set; }
        public DbSet<Exercise> Exercises { get; set; }
        public DbSet<ExerciseSession> ExerciseSessions { get; set; }
        public DbSet<ExerciseResult> ExerciseResults { get; set; }
        public DbSet<LearningLog> LearningLogs { get; set; }
        public DbSet<Meaning> Meanings { get; set; }
        public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
        public DbSet<EmailVerificationToken> EmailVerificationTokens { get; set; }
        public DbSet<StickyNote> StickyNotes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Users>(entity =>
            {
                entity.ToTable("users");
                entity.HasKey(user => user.UserId);

                entity.Property(user => user.UserId)
                    .HasColumnName("user_id")
                    .UseIdentityColumn();

                entity.Property(user => user.Username)
                    .HasColumnName("username")
                    .HasMaxLength(50);

                entity.Property(user => user.Email)
                    .HasColumnName("email")
                    .HasMaxLength(100);

                entity.Property(user => user.PasswordHash)
                    .HasColumnName("password_hash")
                    .HasMaxLength(255);

                entity.Property(user => user.GoogleSubject)
                    .HasColumnName("google_subject")
                    .HasMaxLength(200);

                entity.Property(user => user.Role)
                    .HasColumnName("role")
                    .HasMaxLength(20);

                entity.Property(user => user.Status)
                    .HasColumnName("status")
                    .HasMaxLength(20);

                entity.Property(user => user.IsEmailVerified)
                    .HasColumnName("is_email_verified")
                    .HasDefaultValue(true);

                entity.Property(user => user.CreatedAt)
                    .HasColumnName("created_at")
                    .HasDefaultValueSql("GETDATE()");

                entity.Property(user => user.IsDeleted)
                    .HasColumnName("is_deleted")
                    .HasDefaultValue(false);

                entity.Property(user => user.DeletedAt)
                    .HasColumnName("deleted_at");

                entity.HasIndex(user => user.Username).IsUnique();
                entity.HasIndex(user => user.Email).IsUnique();
                entity.HasIndex(user => user.GoogleSubject)
                    .IsUnique()
                    .HasFilter("[google_subject] IS NOT NULL");
            });

            modelBuilder.Entity<Topic>(entity =>
            {
                entity.ToTable("topic");
                entity.HasKey(topic => topic.TopicId);

                entity.Property(topic => topic.TopicId).HasColumnName("topic_id");
                entity.Property(topic => topic.Name).HasColumnName("name");
                entity.Property(topic => topic.Description).HasColumnName("description");
                entity.Property(topic => topic.ParentTopicId).HasColumnName("parent_topic_id");
            });

            modelBuilder.Entity<Vocabulary>(entity =>
            {
                entity.ToTable("vocabulary");
                entity.HasKey(vocabulary => vocabulary.VocabId);

                entity.Property(vocabulary => vocabulary.VocabId).HasColumnName("vocab_id");
                entity.Property(vocabulary => vocabulary.Word).HasColumnName("word");
                entity.Property(vocabulary => vocabulary.Ipa).HasColumnName("ipa");
                entity.Property(vocabulary => vocabulary.AudioUrl).HasColumnName("audio_url");
                entity.Property(vocabulary => vocabulary.Level).HasColumnName("level");
                entity.Property(vocabulary => vocabulary.MeaningVi).HasColumnName("meaning_vi");
                entity.Property(vocabulary => vocabulary.TopicId).HasColumnName("topic_id");

                entity.HasOne(vocabulary => vocabulary.Topic)
                    .WithMany()
                    .HasForeignKey(vocabulary => vocabulary.TopicId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<Example>(entity =>
            {
                entity.ToTable("example");
                entity.HasKey(example => example.ExampleId);

                entity.Property(example => example.ExampleId).HasColumnName("example_id");
                entity.Property(example => example.VocabId).HasColumnName("vocab_id");
                entity.Property(example => example.ExampleEn).HasColumnName("sentence");
                entity.Property(example => example.ExampleVi).HasColumnName("translation");
                entity.Property(example => example.AudioUrl).HasColumnName("audio_url");

                entity.HasOne(example => example.Vocabulary)
                    .WithMany(vocabulary => vocabulary.Examples)
                    .HasForeignKey(example => example.VocabId);
            });

            modelBuilder.Entity<UserVocabulary>(entity =>
            {
                entity.ToTable("user_vocabulary");
                entity.HasKey(item => new { item.UserId, item.VocabId });

                entity.Property(item => item.UserId).HasColumnName("user_id");
                entity.Property(item => item.VocabId).HasColumnName("vocab_id");
                entity.Property(item => item.Status).HasColumnName("status");
                entity.Property(item => item.Note).HasColumnName("note");
                entity.Property(item => item.FirstLearnedDate).HasColumnName("first_learned_date");

                entity.HasOne<Users>()
                    .WithMany()
                    .HasForeignKey(item => item.UserId)
                    .OnDelete(DeleteBehavior.NoAction);
            });

            modelBuilder.Entity<Progress>(entity =>
            {
                entity.ToTable("progress");
                entity.HasKey(progress => new { progress.UserId, progress.VocabId });

                entity.Property(progress => progress.UserId).HasColumnName("user_id");
                entity.Property(progress => progress.VocabId).HasColumnName("vocab_id");
                entity.Property(progress => progress.EaseFactor)
                    .HasColumnName("ease_factor")
                    .HasDefaultValue(2.5d);
                entity.Property(progress => progress.IntervalDays)
                    .HasColumnName("interval_days")
                    .HasDefaultValue(1);
                entity.Property(progress => progress.Repetitions)
                    .HasColumnName("repetitions")
                    .HasDefaultValue(0);
                entity.Property(progress => progress.LastReviewDate).HasColumnName("last_review_date");
                entity.Property(progress => progress.NextReviewDate).HasColumnName("next_review_date");

                entity.HasOne<Users>()
                    .WithMany()
                    .HasForeignKey(progress => progress.UserId)
                    .OnDelete(DeleteBehavior.NoAction);

                entity.HasOne<UserVocabulary>()
                    .WithOne()
                    .HasForeignKey<Progress>(progress => new { progress.UserId, progress.VocabId })
                    .HasPrincipalKey<UserVocabulary>(item => new { item.UserId, item.VocabId })
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(progress => new { progress.UserId, progress.NextReviewDate });
            });

            modelBuilder.Entity<Exercise>(entity =>
            {
                entity.ToTable("exercise");
                entity.HasKey(exercise => exercise.ExerciseId);

                entity.Property(exercise => exercise.ExerciseId).HasColumnName("exercise_id");
                entity.Property(exercise => exercise.VocabId).HasColumnName("vocab_id");
                entity.Property(exercise => exercise.Type).HasColumnName("exercise_type");
                entity.Property(exercise => exercise.MatchMode).HasColumnName("match_mode");
                entity.Property(exercise => exercise.CreatedAt)
                    .HasColumnName("created_at")
                    .HasDefaultValueSql("GETDATE()");

                entity.HasIndex(exercise => new { exercise.VocabId, exercise.Type, exercise.MatchMode })
                    .IsUnique();
            });

            modelBuilder.Entity<ExerciseSession>(entity =>
            {
                entity.ToTable("exercise_session");
                entity.HasKey(session => session.SessionId);

                entity.Property(session => session.SessionId).HasColumnName("session_id");
                entity.Property(session => session.UserId).HasColumnName("user_id");
                entity.Property(session => session.TopicId).HasColumnName("topic_id");
                entity.Property(session => session.SessionType).HasColumnName("session_type");
                entity.Property(session => session.StartedAt).HasColumnName("started_at");
                entity.Property(session => session.FinishedAt).HasColumnName("finished_at");
                entity.Property(session => session.TotalQuestions).HasColumnName("total_questions");
                entity.Property(session => session.CorrectCount).HasColumnName("correct_count");
                entity.Property(session => session.Score).HasColumnName("score");

                entity.HasOne<Users>()
                    .WithMany()
                    .HasForeignKey(session => session.UserId)
                    .OnDelete(DeleteBehavior.NoAction);

                entity.HasOne<Topic>()
                    .WithMany()
                    .HasForeignKey(session => session.TopicId)
                    .OnDelete(DeleteBehavior.NoAction);

                entity.HasIndex(session => new { session.UserId, session.StartedAt });
            });

            modelBuilder.Entity<ExerciseResult>(entity =>
            {
                entity.ToTable("exercise_result");
                entity.HasKey(result => result.ResultId);

                entity.Property(result => result.ResultId).HasColumnName("result_id");
                entity.Property(result => result.SessionId).HasColumnName("session_id");
                entity.Property(result => result.ExerciseId).HasColumnName("exercise_id");
                entity.Property(result => result.UserId).HasColumnName("user_id");
                entity.Property(result => result.IsCorrect).HasColumnName("is_correct");
                entity.Property(result => result.Quality).HasColumnName("quality");
                entity.Property(result => result.AnsweredAt).HasColumnName("answered_at");

                entity.HasOne<Users>()
                    .WithMany()
                    .HasForeignKey(result => result.UserId)
                    .OnDelete(DeleteBehavior.NoAction);

                entity.HasOne<ExerciseSession>()
                    .WithMany()
                    .HasForeignKey(result => result.SessionId)
                    .OnDelete(DeleteBehavior.NoAction);

                entity.HasIndex(result => new { result.UserId, result.AnsweredAt });
                entity.HasIndex(result => new { result.SessionId, result.ExerciseId });
            });

            modelBuilder.Entity<LearningLog>(entity =>
            {
                entity.ToTable("learning_log");
                entity.HasKey(log => log.LogId);

                entity.Property(log => log.LogId).HasColumnName("log_id");
                entity.Property(log => log.UserId).HasColumnName("user_id");
                entity.Property(log => log.SessionId).HasColumnName("session_id");
                entity.Property(log => log.Date).HasColumnName("date");
                entity.Property(log => log.ActivityType).HasColumnName("activity_type");
                entity.Property(log => log.WordsStudied).HasColumnName("words_studied");
                entity.Property(log => log.Score).HasColumnName("score");

                entity.HasOne<ExerciseSession>()
                    .WithMany()
                    .HasForeignKey(log => log.SessionId)
                    .OnDelete(DeleteBehavior.NoAction);

                entity.HasIndex(log => new { log.UserId, log.Date });
                entity.HasIndex(log => log.SessionId).IsUnique();
            });

            modelBuilder.Entity<Meaning>(entity =>
            {
                entity.ToTable("meaning");
                entity.HasKey(meaning => meaning.MeaningId);

                entity.Property(meaning => meaning.MeaningId).HasColumnName("meaning_id");
                entity.Property(meaning => meaning.VocabId).HasColumnName("vocab_id");
                entity.Property(meaning => meaning.MeaningEn).HasColumnName("meaning_en");
                entity.Property(meaning => meaning.MeaningVi).HasColumnName("meaning_vi");
                entity.Property(meaning => meaning.Type).HasColumnName("type");

                entity.HasOne(meaning => meaning.Vocabulary)
                    .WithMany()
                    .HasForeignKey(meaning => meaning.VocabId);
            });

            modelBuilder.Entity<PasswordResetToken>(entity =>
            {
                entity.ToTable("password_reset_token");
                entity.HasKey(item => item.PasswordResetTokenId);

                entity.Property(item => item.PasswordResetTokenId)
                    .HasColumnName("password_reset_token_id")
                    .UseIdentityColumn();

                entity.Property(item => item.UserId).HasColumnName("user_id");

                entity.Property(item => item.TokenHash)
                    .HasColumnName("token_hash")
                    .HasMaxLength(255);

                entity.Property(item => item.ExpiresAt).HasColumnName("expires_at");

                entity.Property(item => item.CreatedAt)
                    .HasColumnName("created_at")
                    .HasDefaultValueSql("GETDATE()");

                entity.Property(item => item.UsedAt).HasColumnName("used_at");

                entity.Property(item => item.ConsumedByIp)
                    .HasColumnName("consumed_by_ip")
                    .HasMaxLength(64);

                entity.HasOne(item => item.User)
                    .WithMany()
                    .HasForeignKey(item => item.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(item => item.TokenHash);
                entity.HasIndex(item => new { item.UserId, item.CreatedAt });
                entity.HasIndex(item => item.ExpiresAt);
            });

            modelBuilder.Entity<EmailVerificationToken>(entity =>
            {
                entity.ToTable("email_verification_token");
                entity.HasKey(item => item.EmailVerificationTokenId);

                entity.Property(item => item.EmailVerificationTokenId)
                    .HasColumnName("email_verification_token_id")
                    .UseIdentityColumn();

                entity.Property(item => item.UserId).HasColumnName("user_id");

                entity.Property(item => item.TokenHash)
                    .HasColumnName("token_hash")
                    .HasMaxLength(255);

                entity.Property(item => item.ExpiresAt).HasColumnName("expires_at");

                entity.Property(item => item.CreatedAt)
                    .HasColumnName("created_at")
                    .HasDefaultValueSql("GETDATE()");

                entity.Property(item => item.UsedAt).HasColumnName("used_at");

                entity.Property(item => item.ConsumedByIp)
                    .HasColumnName("consumed_by_ip")
                    .HasMaxLength(64);

                entity.HasOne(item => item.User)
                    .WithMany()
                    .HasForeignKey(item => item.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(item => item.TokenHash).IsUnique();
                entity.HasIndex(item => new { item.UserId, item.CreatedAt });
                entity.HasIndex(item => item.ExpiresAt);
            });

            modelBuilder.Entity<StickyNote>(entity =>
            {
                entity.ToTable("sticky_note");
                entity.HasKey(note => note.StickyNoteId);

                entity.Property(note => note.StickyNoteId)
                    .HasColumnName("sticky_note_id")
                    .UseIdentityColumn();

                entity.Property(note => note.UserId)
                    .HasColumnName("user_id");

                entity.Property(note => note.Content)
                    .HasColumnName("content")
                    .HasMaxLength(1000)
                    .HasDefaultValue(string.Empty);

                entity.Property(note => note.Color)
                    .HasColumnName("color")
                    .HasMaxLength(32)
                    .HasDefaultValue("yellow");

                entity.Property(note => note.IsPinned)
                    .HasColumnName("is_pinned")
                    .HasDefaultValue(false);

                entity.Property(note => note.CreatedAt)
                    .HasColumnName("created_at")
                    .HasDefaultValueSql("GETDATE()");

                entity.Property(note => note.UpdatedAt)
                    .HasColumnName("updated_at")
                    .HasDefaultValueSql("GETDATE()");

                entity.HasOne<Users>()
                    .WithMany()
                    .HasForeignKey(note => note.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(note => new { note.UserId, note.IsPinned, note.UpdatedAt });
            });
        }
    }
}
