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
        public DbSet<ExerciseResult> ExerciseResults { get; set; }
        public DbSet<LearningLog> LearningLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Users>()
                .HasKey(user => user.UserId);

            modelBuilder.Entity<Users>()
                .Property(user => user.UserId)
                .UseIdentityColumn();

            modelBuilder.Entity<Users>()
                .HasIndex(user => user.Username)
                .IsUnique();

            modelBuilder.Entity<Users>()
                .HasIndex(user => user.Email)
                .IsUnique();

            modelBuilder.Entity<Users>()
                .HasIndex(user => user.GoogleSubject)
                .IsUnique()
                .HasFilter("[google_subject] IS NOT NULL");

            modelBuilder.Entity<Users>()
                .Property(user => user.CreatedAt)
                .HasDefaultValueSql("GETDATE()");

            modelBuilder.Entity<UserVocabulary>()
                .HasKey(uv => new { uv.UserId, uv.VocabId });

            modelBuilder.Entity<Progress>()
                .HasKey(progress => new { progress.UserId, progress.VocabId });

            modelBuilder.Entity<Example>()
                .HasOne(example => example.Vocabulary)
                .WithMany(vocabulary => vocabulary.Examples)
                .HasForeignKey(example => example.VocabId);

            modelBuilder.Entity<Vocabulary>()
                .HasOne(vocabulary => vocabulary.Topic)
                .WithMany()
                .HasForeignKey(vocabulary => vocabulary.TopicId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<UserVocabulary>()
                .HasOne<Users>()
                .WithMany()
                .HasForeignKey(uv => uv.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Progress>()
                .HasOne<Users>()
                .WithMany()
                .HasForeignKey(progress => progress.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Progress>()
                .HasOne<UserVocabulary>()
                .WithOne()
                .HasForeignKey<Progress>(progress => new { progress.UserId, progress.VocabId })
                .HasPrincipalKey<UserVocabulary>(userVocabulary => new { userVocabulary.UserId, userVocabulary.VocabId })
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<ExerciseResult>()
                .HasOne<Users>()
                .WithMany()
                .HasForeignKey(result => result.UserId)
                .OnDelete(DeleteBehavior.NoAction);
        }
    }
}
