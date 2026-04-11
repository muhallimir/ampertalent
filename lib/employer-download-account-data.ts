"use server";

// import { revalidatePath } from "next/cache";
// import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
// import { Prisma } from "@prisma/client";

export async function downloadAccountData() {
  try {
    const user = await getCurrentUser();

    // Better error handling for user object
    if (!user) {
      throw new Error("Unauthorized: No user found");
    }

    // Check if we have the required user data
    const clerkUserId = user.clerkUser?.id;

    if (!clerkUserId) {
      console.error("User object missing clerkUserId:", JSON.stringify(user, null, 2));
      throw new Error("Unauthorized: User ID not found");
    }

    // Fetch all user-related data
    const userData: any = {};

    // User profile data with comprehensive employer relations
    userData.userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: clerkUserId },
      include: {
        employer: {
          include: {
            jobs: {
              include: {
                applications: {
                  include: {
                    seeker: {
                      include: {
                        user: true
                      }
                    }
                  }
                }
              }
            },
            packages: true,
            currentPackage: true,
            conciergeRequests: true,
            conciergeChats: {
              include: {
                messages: true
              }
            },
            emailBlastRequests: true,
            featuredJobRequests: true,
            teamInvitations: true,
            teamMembers: true,
            paymentMethods: true
          }
        },
        jobSeeker: true,
        notifications: true,
        adminActions: true,
        conciergeAssignments: true,
        conciergeChats: true,
        conciergeChatMessages: true,
        seekerConciergeChats: true,
        seekerConciergeChatsAsSeeker: true,
        seekerConciergeChatMessages: true,
        externalPayments: true,
        sentTeamInvitations: true,
        teamInvitations: true,
      }
    });

    // If employer, get employer-related data
    if (userData.userProfile?.employer) {
      // Jobs created by this employer with all related data
      userData.jobs = await db.job.findMany({
        where: {
          employerId: userData.userProfile.employer.id
        },
        include: {
          applications: {
            include: {
              seeker: {
                include: {
                  user: true
                }
              }
            }
          },
          employerPackages: true,
          conciergeRequests: true,
          conciergeChats: {
            include: {
              messages: true
            }
          },
          seekerConciergeChats: true,
          emailBlastRequests: true,
          featuredJobRequests: true
        }
      });

      // Employer packages with related data
      userData.employerPackages = await db.employerPackage.findMany({
        where: {
          employerId: userData.userProfile.employer.id
        },
        include: {
          emailBlastRequests: true,
          currentForEmployers: true,
          featuredJobRequests: true,
          invoices: true,
          jobs: true
        }
      });

      // Concierge requests
      userData.conciergeRequests = await db.conciergeRequest.findMany({
        where: {
          employerId: userData.userProfile.employer.id
        },
        include: {
          job: true,
          assignedAdmin: true
        }
      });

      // Concierge chats with messages
      userData.conciergeChats = await db.conciergeChat.findMany({
        where: {
          employerId: userData.userProfile.employer.id
        },
        include: {
          job: true,
          admin: true,
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      // Email blast requests
      userData.emailBlastRequests = await db.emailBlastRequest.findMany({
        where: {
          employerId: userData.userProfile.employer.id
        },
        include: {
          job: true,
          employer: true,
          package: true
        }
      });

      // Featured job requests
      userData.featuredJobRequests = await db.featuredJobRequest.findMany({
        where: {
          employerId: userData.userProfile.employer.id
        },
        include: {
          job: true,
          employer: true,
          package: true
        }
      });
    }

    // Applications related to employer's jobs
    if (userData.userProfile?.employer) {
      userData.applications = await db.application.findMany({
        where: {
          job: {
            employerId: userData.userProfile.employer.id
          }
        },
        include: {
          job: true,
          seeker: {
            include: {
              user: true
            }
          }
        }
      });
    }

    // Notifications
    userData.notifications = await db.notification.findMany({
      where: {
        userId: clerkUserId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Payment methods
    userData.paymentMethods = await db.paymentMethod.findMany({
      where: {
        OR: [
          { employerId: userData.userProfile?.employer?.id },
          { seekerId: userData.userProfile?.jobSeeker?.id }
        ]
      }
    });

    // External payments with subscriptions
    userData.externalPayments = await db.externalPayment.findMany({
      where: {
        userId: clerkUserId
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        subscriptions: true
      }
    });

    // Invoices related to employer packages
    userData.invoices = await db.invoice.findMany({
      where: {
        employerPackage: {
          employerId: userData.userProfile?.employer?.id
        }
      },
      include: {
        employerPackage: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Team members and invitations with related data
    userData.teamMembers = await db.teamMember.findMany({
      where: {
        OR: [
          { employerId: clerkUserId },
          { userId: clerkUserId },
          { employerId: userData.userProfile?.employer?.id }
        ]
      },
      include: {
        employer: true,
        inviter: true,
        user: true
      }
    });

    userData.teamInvitations = await db.teamInvitation.findMany({
      where: {
        OR: [
          { employerId: clerkUserId },
          { email: userData.userProfile?.email || undefined },
          { employerId: userData.userProfile?.employer?.id }
        ]
      },
      include: {
        employer: true,
        inviter: true
      }
    });

    // Pending signups
    userData.pendingSignups = await db.pendingSignup.findMany({
      where: {
        clerkUserId: clerkUserId
      }
    });

    // Pending job posts
    userData.pendingJobPosts = await db.pendingJobPost.findMany({
      where: {
        clerkUserId: clerkUserId
      }
    });

    // Format data for download
    // Custom replacer to handle BigInt values (teammate added BigInt columns to DB without schema update)
    const dataStr = JSON.stringify(userData, (key, value) => {
      // Convert BigInt to string to avoid serialization error
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    }, 2);

    // Return data for client-side download
    return {
      success: true,
      data: dataStr,
      filename: `account-data-${user.profile.role}-${user.profile.name.replace(' ', '-')}-${new Date().toISOString().split('T')[0]}.json`
    };
  } catch (error) {
    console.error("Error downloading account data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to download account data"
    };
  }
}