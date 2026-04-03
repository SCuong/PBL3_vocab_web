using System;
using System.Security.Cryptography;

var salt = new byte[16];
using (var rng = RandomNumberGenerator.Create()) rng.GetBytes(salt);
var hash = Rfc2898DeriveBytes.Pbkdf2("24032006", salt, 120000, HashAlgorithmName.SHA256, 32);
Console.WriteLine($"PBKDF2$120000${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}");
