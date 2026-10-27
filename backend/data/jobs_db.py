from typing import List
from backend.models.schemas import BackendJob

# Job listings. Empty until a real source (e.g. Shine's jobs API) is connected;
# the previous sample listings were demo data.
JOBS_DB: List[BackendJob] = []
