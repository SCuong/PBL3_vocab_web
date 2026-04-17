using System;
using System.Collections.Generic;
using System.IO;

namespace ImportVocabularyPBL3
{
    internal static class ProjectFileLocator
    {
        public static string ResolveExistingFile(string configuredPath)
        {
            if (string.IsNullOrWhiteSpace(configuredPath))
            {
                throw new ArgumentException("Configured path is empty.", nameof(configuredPath));
            }

            if (Path.IsPathRooted(configuredPath))
            {
                if (File.Exists(configuredPath))
                {
                    return Path.GetFullPath(configuredPath);
                }

                throw new FileNotFoundException(
                    "Configured file was not found.",
                    configuredPath
                );
            }

            var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var root in GetSearchRoots())
            {
                foreach (var candidate in EnumerateCandidates(root, configuredPath))
                {
                    if (!visited.Add(candidate))
                    {
                        continue;
                    }

                    if (File.Exists(candidate))
                    {
                        return candidate;
                    }
                }
            }

            throw new FileNotFoundException(
                $"Could not find '{configuredPath}'. " +
                "Check App.config or place the file near the project/bin folder."
            );
        }

        private static IEnumerable<string> GetSearchRoots()
        {
            yield return Environment.CurrentDirectory;
            yield return AppDomain.CurrentDomain.BaseDirectory;
        }

        private static IEnumerable<string> EnumerateCandidates(string root, string configuredPath)
        {
            var directory = new DirectoryInfo(root);

            while (directory != null)
            {
                yield return Path.GetFullPath(
                    Path.Combine(directory.FullName, configuredPath)
                );

                directory = directory.Parent;
            }
        }
    }
}
