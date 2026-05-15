using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace VocabLearning.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [IgnoreAntiforgeryToken]
    public class AntiforgeryController : ControllerBase
    {
        private readonly IAntiforgery antiforgery;

        public AntiforgeryController(IAntiforgery antiforgery)
        {
            this.antiforgery = antiforgery;
        }

        // SPA bootstrap: GET to seed XSRF-TOKEN cookie + return token value.
        // SPA echoes the token in X-XSRF-TOKEN header on subsequent unsafe requests.
        [HttpGet("/api/auth/antiforgery")]
        [HttpGet("/api/v1/auth/antiforgery")]
        public IActionResult GetToken()
        {
            var tokens = antiforgery.GetAndStoreTokens(HttpContext);
            Response.Headers.CacheControl = "no-store";
            return Ok(new
            {
                token = tokens.RequestToken,
                headerName = tokens.HeaderName ?? "X-XSRF-TOKEN"
            });
        }
    }
}
