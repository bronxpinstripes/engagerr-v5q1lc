import { revalidatePath, revalidateTag } from 'next/cache'; // ^14.0.0
import { NextRequest, NextResponse } from 'next/server'; // ^14.0.0
import { isClient, generateId } from '../../../lib/utils';

/**
 * Handles GET requests to revalidate cache based on query parameters
 * Supports revalidation by path or tag with security check
 */
export async function GET(request: NextRequest) {
  // Safety check - route handlers should always run on server
  if (isClient()) {
    console.error('Revalidation route executed on client side');
    return NextResponse.json(
      { success: false, message: 'Revalidation can only be performed server-side' },
      { status: 400 }
    );
  }

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const tag = searchParams.get('tag');
  const secret = searchParams.get('secret');

  // Validate secret
  const revalidationSecret = process.env.REVALIDATION_SECRET;
  if (!secret || secret !== revalidationSecret) {
    return NextResponse.json(
      { success: false, message: 'Invalid revalidation secret' },
      { status: 401 }
    );
  }

  try {
    // Generate request ID for tracking
    const requestId = generateId();
    
    // Must provide either path or tag
    if (!path && !tag) {
      return NextResponse.json(
        { success: false, message: 'Either path or tag parameter is required' },
        { status: 400 }
      );
    }

    // Revalidate path if provided
    if (path) {
      revalidatePath(path);
      console.log(`[Revalidation:${requestId}] Path revalidated: ${path}`);
    }

    // Revalidate tag if provided
    if (tag) {
      revalidateTag(tag);
      console.log(`[Revalidation:${requestId}] Tag revalidated: ${tag}`);
    }

    return NextResponse.json({
      success: true,
      revalidated: true,
      path: path || null,
      tag: tag || null,
      requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[Revalidation Error] ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json(
      { success: false, message: 'Revalidation failed', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Handles POST requests to revalidate cache with path/tag in request body
 * Provides a more secure alternative to GET for sensitive operations
 */
export async function POST(request: NextRequest) {
  // Safety check - route handlers should always run on server
  if (isClient()) {
    console.error('Revalidation route executed on client side');
    return NextResponse.json(
      { success: false, message: 'Revalidation can only be performed server-side' },
      { status: 400 }
    );
  }

  try {
    // Parse JSON body
    const body = await request.json();
    const { path, tag, secret } = body;

    // Validate secret
    const revalidationSecret = process.env.REVALIDATION_SECRET;
    if (!secret || secret !== revalidationSecret) {
      return NextResponse.json(
        { success: false, message: 'Invalid revalidation secret' },
        { status: 401 }
      );
    }

    // Generate request ID for tracking
    const requestId = generateId();
    
    // Must provide either path or tag
    if (!path && !tag) {
      return NextResponse.json(
        { success: false, message: 'Either path or tag parameter is required' },
        { status: 400 }
      );
    }

    // Revalidate path if provided
    if (path) {
      revalidatePath(path);
      console.log(`[Revalidation:${requestId}] Path revalidated: ${path}`);
    }

    // Revalidate tag if provided
    if (tag) {
      revalidateTag(tag);
      console.log(`[Revalidation:${requestId}] Tag revalidated: ${tag}`);
    }

    return NextResponse.json({
      success: true,
      revalidated: true,
      path: path || null,
      tag: tag || null,
      requestId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[Revalidation Error] ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json(
      { success: false, message: 'Revalidation failed', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}