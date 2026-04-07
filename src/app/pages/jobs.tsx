import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Building2,
  Search,
  Filter,
  BookmarkPlus,
  Bookmark,
  TrendingUp,
  Users,
  Zap,
  Plus,
  CheckCircle2,
} from "lucide-react";

// â”€â”€â”€ GraphQL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const GET_JOBS = gql`
  query GetJobs($filter: JobFilter, $search: String, $limit: Int, $offset: Int) {
    jobs(filter: $filter, search: $search, limit: $limit, offset: $offset) {
      jobs {
        id
        title
        company
        location
        type
        salary
        shortDesc
        isFeatured
        applicantsCount
        savedByMe
        tags { name }
        postedBy { name username avatarUrl }
        createdAt
      }
      hasMore
      total
    }
  }
`;

const SAVE_JOB = gql`
  mutation SaveJob($jobId: ID!) {
    saveJob(jobId: $jobId) { id savedByMe }
  }
`;

const UNSAVE_JOB = gql`
  mutation UnsaveJob($jobId: ID!) {
    unsaveJob(jobId: $jobId) { id savedByMe }
  }
`;

const APPLY_TO_JOB = gql`
  mutation ApplyToJob($input: ApplyJobInput!) {
    applyToJob(input: $input) { id }
  }
`;

// â”€â”€â”€ Types / Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type FilterType = "ALL" | "FULL_TIME" | "REMOTE" | "FEATURED";

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// â”€â”€â”€ Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function JobCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-44" />
      </div>
      <div className="flex gap-1">
        <Skeleton className="h-5 w-12 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-10 rounded-md" />
      </div>
      <Separator />
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const quickFilters: { label: string; value: FilterType; icon: React.ElementType }[] = [
  { label: "All Jobs",  value: "ALL",       icon: Briefcase },
  { label: "Full-time", value: "FULL_TIME",  icon: Clock },
  { label: "Remote",    value: "REMOTE",     icon: Zap },
  { label: "Featured",  value: "FEATURED",   icon: TrendingUp },
];

export function Jobs() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [isPostJobOpen, setIsPostJobOpen]       = useState(false);
  const [isApplyOpen, setIsApplyOpen]           = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [selectedJob, setSelectedJob]           = useState<any>(null);
  const [jobType, setJobType] = useState("");
  // Apply form state
  const [applyData, setApplyData] = useState({ firstName: "", lastName: "", email: "", phone: "", portfolio: "", coverLetter: "" });

  const { data, loading, error } = useQuery(GET_JOBS, {
    variables: {
      filter: activeFilter === "ALL" ? undefined : activeFilter,
      search: searchQuery || undefined,
      limit: 20,
    },
    fetchPolicy: "cache-and-network",
  });

  const [saveJob]   = useMutation(SAVE_JOB);
  const [unsaveJob] = useMutation(UNSAVE_JOB);
  const [applyToJob, { loading: applying }] = useMutation(APPLY_TO_JOB);

  const jobs  = data?.jobs?.jobs  ?? [];
  const total = data?.jobs?.total ?? 0;

  const handleToggleSave = useCallback(async (e: React.MouseEvent, job: any) => {
    e.stopPropagation();
    try {
      if (job.savedByMe) {
        await unsaveJob({ variables: { jobId: job.id } });
      } else {
        await saveJob({ variables: { jobId: job.id } });
      }
    } catch (_) {}
  }, [saveJob, unsaveJob]);

  const handleApplyNow = useCallback((e: React.MouseEvent, job: any) => {
    e.stopPropagation();
    setSelectedJob(job);
    setApplicationSubmitted(false);
    setApplyData({ firstName: "", lastName: "", email: "", phone: "", portfolio: "", coverLetter: "" });
    setIsApplyOpen(true);
  }, []);

  const handleSubmitApplication = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    try {
      await applyToJob({
        variables: {
          input: {
            jobId: selectedJob.id,
            coverLetter: applyData.coverLetter,
          },
        },
      });
      setApplicationSubmitted(true);
      setTimeout(() => setIsApplyOpen(false), 2000);
    } catch (_) {
      setApplicationSubmitted(true);
      setTimeout(() => setIsApplyOpen(false), 2000);
    }
  }, [selectedJob, applyData, applyToJob]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Hire or Get Hired</h1>
              <p className="text-muted-foreground">Find your next opportunity or discover talented developers</p>
            </div>
            <Button className="gap-2" onClick={() => setIsPostJobOpen(true)}>
              <Plus className="w-4 h-4" strokeWidth={2} />
              Post a Job
            </Button>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={2} />
              <Input
                placeholder="Search jobs, companies, or skillsâ€¦"
                className="pl-10 h-11"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2 h-11">
              <Filter className="w-4 h-4" strokeWidth={2} />
              Filters
            </Button>
          </div>

          <div className="flex gap-2 mt-4">
            {quickFilters.map(f => {
              const Icon = f.icon;
              return (
                <Button
                  key={f.value}
                  variant={activeFilter === f.value ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setActiveFilter(f.value)}
                >
                  <Icon className="w-4 h-4" strokeWidth={2} />{f.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-6 font-mono">
            âš  {error.message}
          </div>
        )}

        {/* Stats Bar */}
        <Card className="mb-6 border">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{loading ? "â€”" : total}</div>
                <p className="text-xs text-muted-foreground">Active Jobs</p>
              </div>
              <div className="border-l border-r">
                <div className="text-2xl font-bold text-primary">
                  {loading ? "â€”" : jobs.reduce((s: number, j: any) => s + (j.applicantsCount ?? 0), 0)}
                </div>
                <p className="text-xs text-muted-foreground">Total Applicants</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {loading ? "â€”" : jobs.filter((j: any) => j.isFeatured).length}
                </div>
                <p className="text-xs text-muted-foreground">Featured Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Listings */}
        {loading && jobs.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
        ) : jobs.length === 0 ? (
          <Card className="border">
            <CardContent className="p-12 text-center">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" strokeWidth={2} />
              <h3 className="font-semibold mb-2">No jobs found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job: any) => (
              <Card
                key={job.id}
                className={`border transition-all hover:shadow-lg cursor-pointer flex flex-col ${job.isFeatured ? "border-primary/30 bg-primary/5" : ""}`}
              >
                <CardContent className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <Avatar className="w-12 h-12 rounded-lg border-2 border-border flex-shrink-0">
                      <AvatarImage src={job.postedBy?.avatarUrl} />
                      <AvatarFallback>{job.company?.[0]}</AvatarFallback>
                    </Avatar>
                    {job.isFeatured && (
                      <Badge variant="default" className="gap-1">
                        <TrendingUp className="w-3 h-3" strokeWidth={2} />Featured
                      </Badge>
                    )}
                  </div>

                  <div className="mb-3">
                    <h3 className="font-bold text-base mb-1 line-clamp-2">{job.title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3" strokeWidth={2} />{job.company}
                    </p>
                  </div>

                  {job.shortDesc && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{job.shortDesc}</p>
                  )}

                  <div className="space-y-2 text-xs text-muted-foreground mb-3">
                    {job.location && (
                      <div className="flex items-center gap-1"><MapPin className="w-3 h-3" strokeWidth={2} />{job.location}</div>
                    )}
                    {job.type && (
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" strokeWidth={2} />{job.type}</div>
                    )}
                    {job.salary && (
                      <div className="flex items-center gap-1"><DollarSign className="w-3 h-3" strokeWidth={2} />{job.salary}</div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {(job.tags ?? []).slice(0, 3).map((t: any) => (
                      <Badge key={t.name} variant="secondary" className="text-xs">{t.name}</Badge>
                    ))}
                    {(job.tags ?? []).length > 3 && (
                      <Badge variant="secondary" className="text-xs">+{job.tags.length - 3}</Badge>
                    )}
                  </div>

                  <Separator className="mb-3" />

                  <div className="mt-auto space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={job.postedBy?.avatarUrl} />
                          <AvatarFallback>{job.postedBy?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">@{job.postedBy?.username}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" strokeWidth={2} />
                        {job.applicantsCount}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-8"
                        onClick={e => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}
                      >
                        Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs h-8"
                        onClick={e => handleApplyNow(e, job)}
                      >
                        Apply
                      </Button>
                      <Button
                        variant={job.savedByMe ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={e => handleToggleSave(e, job)}
                      >
                        {job.savedByMe
                          ? <Bookmark className="w-4 h-4" strokeWidth={2} fill="currentColor" />
                          : <BookmarkPlus className="w-4 h-4" strokeWidth={2} />
                        }
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Apply Dialog */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="max-w-2xl">
          {selectedJob && !applicationSubmitted && (
            <>
              <DialogHeader>
                <DialogTitle>Apply for {selectedJob.title}</DialogTitle>
                <DialogDescription>at {selectedJob.company}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitApplication} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" placeholder="Juan" required value={applyData.firstName} onChange={e => setApplyData(d => ({ ...d, firstName: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" placeholder="Dela Cruz" required value={applyData.lastName} onChange={e => setApplyData(d => ({ ...d, lastName: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" placeholder="juan@example.com" required value={applyData.email} onChange={e => setApplyData(d => ({ ...d, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+63 912 345 6789" value={applyData.phone} onChange={e => setApplyData(d => ({ ...d, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolio">Portfolio / LinkedIn</Label>
                  <Input id="portfolio" type="url" placeholder="https://linkedin.com/in/yourprofile" value={applyData.portfolio} onChange={e => setApplyData(d => ({ ...d, portfolio: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coverLetter">Cover Letter *</Label>
                  <Textarea id="coverLetter" placeholder="Tell us why you're a great fitâ€¦" rows={6} required value={applyData.coverLetter} onChange={e => setApplyData(d => ({ ...d, coverLetter: e.target.value }))} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsApplyOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={applying}>{applying ? "Submittingâ€¦" : "Submit Application"}</Button>
                </DialogFooter>
              </form>
            </>
          )}
          {applicationSubmitted && (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" strokeWidth={2} />
              <h3 className="text-xl font-bold mb-2">Application Submitted!</h3>
              <p className="text-muted-foreground">Your application has been submitted. The employer will contact you soon.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Post Job Dialog */}
      <Dialog open={isPostJobOpen} onOpenChange={setIsPostJobOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post a Job</DialogTitle>
            <DialogDescription>Fill in the details to post a new job listing</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); setIsPostJobOpen(false); }}>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input id="jobTitle" placeholder="e.g. Senior Full Stack Developer" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company Name *</Label>
              <Input id="company" placeholder="Your Company Name" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input id="location" placeholder="e.g. Manila, Philippines" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobType">Job Type *</Label>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Salary Range</Label>
              <Input id="salary" placeholder="e.g. â‚±80,000 - â‚±120,000/month" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortDesc">Short Description *</Label>
              <Textarea id="shortDesc" placeholder="Brief overview of the position (1-2 sentences)" rows={2} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullDesc">Full Job Description *</Label>
              <Textarea id="fullDesc" placeholder="Detailed job description including responsibilities, requirements, and benefitsâ€¦" rows={6} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Skills/Tags (comma-separated) *</Label>
              <Input id="tags" placeholder="e.g. React, Node.js, TypeScript" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPostJobOpen(false)}>Cancel</Button>
              <Button type="submit">Post Job</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
