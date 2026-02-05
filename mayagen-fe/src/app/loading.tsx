import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950">
      <div className="space-y-4 w-full max-w-md p-4">
         <div className="flex items-center justify-center mb-8">
            <Skeleton className="h-8 w-8 rounded-full bg-neutral-800" />
            <Skeleton className="h-8 w-32 ml-2 bg-neutral-800" />
         </div>
         <Skeleton className="h-12 w-full bg-neutral-900" />
         <Skeleton className="h-12 w-full bg-neutral-900" />
         <Skeleton className="h-12 w-full bg-neutral-900" />
      </div>
    </div>
  )
}
