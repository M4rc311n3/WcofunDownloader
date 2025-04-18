import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { InsertSeries, InsertEpisode } from '@shared/schema';
import fs from 'fs';
import path from 'path';

export class Scraper {
  /**
   * Check if a URL is a valid video URL that can be downloaded
   */
  isValidVideoUrl(url: string): boolean {
    if (!url) return false;
    
    // Check if URL is just a placeholder word or very short (like "yeni")
    if (url.length < 10) {
      console.log(`[Scraper] URL too short, likely invalid: ${url}`);
      return false;
    }
    
    // Check if it has valid protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      console.log(`[Scraper] URL doesn't have valid protocol: ${url}`);
      return false;
    }
    
    // Check if it has valid video file extension
    const validExtensions = ['.mp4', '.m3u8', '.flv', '.webm', '.mov', '.mkv'];
    const hasValidExtension = validExtensions.some(ext => url.toLowerCase().includes(ext));
    
    if (!hasValidExtension) {
      // Even without extension, if it contains video pattern it may be valid
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      const hasVideoParams = urlParams.has('file') || urlParams.has('source') || urlParams.has('video');
      
      if (!hasVideoParams) {
        console.log(`[Scraper] URL doesn't have valid video extension or parameters: ${url}`);
        return false;
      }
    }
    
    // Check if the URL is valid by trying to create a URL object
    try {
      new URL(url);
      return true;
    } catch (error) {
      console.log(`[Scraper] Invalid URL format: ${url}`);
      return false;
    }
  }
  
  /**
   * Get source HTML from a URL
   */
  async getSourceHtml(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      throw new Error(`Error fetching ${url}: ${error}`);
    }
  }

  /**
   * Determine if the URL is for a series or a single episode
   */
  determineUrlType(url: string): { type: 'series' | 'episode', url: string } {
    const normalizedUrl = url.toLowerCase();
    console.log(`[Scraper] Determining URL type for: ${normalizedUrl}`);
    
    // WCOFun series URL patterns - not all use /anime/
    if (
      normalizedUrl.includes('/anime/') ||
      normalizedUrl.includes('/category/') ||
      normalizedUrl.includes('/series/') ||
      normalizedUrl.includes('/cartoon/') ||
      // If URL ends with a title and not a specific episode
      (!normalizedUrl.includes('/episode') && !normalizedUrl.includes('/watch/') && !normalizedUrl.includes('/video/'))
    ) {
      console.log(`[Scraper] Determined as series URL`);
      return { type: 'series', url };
    } else {
      console.log(`[Scraper] Determined as episode URL`);
      return { type: 'episode', url };
    }
  }

  /**
   * Parse series information from HTML
   */
  parseSeriesInfo(html: string, sourceUrl: string): InsertSeries {
    const $ = cheerio.load(html);
    
    // Try different selectors for title
    let title = $('.video-title').text().trim();
    console.log(`[Scraper] Title from .video-title: "${title}"`);
    
    if (!title) {
      title = $('h1.title').text().trim();
      console.log(`[Scraper] Title from h1.title: "${title}"`);
    }
    
    if (!title) {
      title = $('title').text().trim().replace(' | WCO', '').replace('Watch ', '');
      console.log(`[Scraper] Title from title tag: "${title}"`);
    }
    
    if (!title) {
      // Extract from URL as last resort
      const urlParts = sourceUrl.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      title = lastPart.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      console.log(`[Scraper] Title from URL: "${title}"`);
    }
    
    // Get description from the appropriate meta tag or content div
    let description = $('meta[name="description"]').attr('content') || '';
    if (!description) {
      description = $('.content-padding p').text().trim();
    }
    
    if (!description) {
      description = $('.desc').text().trim();
    }
    
    // Count episodes
    let episodeElements = $('.listing a');
    let totalEpisodes = episodeElements.length;
    
    // Try alternative episode selectors if the first one returns 0
    if (totalEpisodes === 0) {
      episodeElements = $('#catlist-listview a');
      totalEpisodes = episodeElements.length;
    }
    
    if (totalEpisodes === 0) {
      episodeElements = $('.cat-eps a');
      totalEpisodes = episodeElements.length;
    }
    
    if (totalEpisodes === 0) {
      // Count links that might be episodes
      totalEpisodes = $('a').filter((i, el) => {
        const href = $(el).attr('href') || '';
        return href.includes('/watch/') || href.includes('/video/');
      }).length;
    }
    
    // Get image URL - try different selectors
    let imageUrl = $('.img-responsive').attr('src') || '';
    if (!imageUrl) {
      imageUrl = $('.thumb img').attr('src') || '';
    }
    
    if (!imageUrl) {
      imageUrl = $('meta[property="og:image"]').attr('content') || '';
    }
    
    console.log(`[Scraper] Parsed series: title="${title}", description length=${description.length}, episodes=${totalEpisodes}, imageUrl=${imageUrl ? 'exists' : 'not found'}`);
    
    return {
      title,
      description,
      totalEpisodes,
      imageUrl,
      sourceUrl
    };
  }

  /**
   * Parse episode information from series HTML
   */
  parseEpisodeList(html: string, seriesId: number): InsertEpisode[] {
    const $ = cheerio.load(html);
    const episodes: InsertEpisode[] = [];
    
    // Try different selectors to find episodes list
    let episodeElements = $('.listing a');
    console.log(`[Scraper] Found ${episodeElements.length} episodes with .listing a selector`);
    
    // If the primary selector doesn't work, try alternatives
    if (episodeElements.length === 0) {
      episodeElements = $('#catlist-listview a');
      console.log(`[Scraper] Found ${episodeElements.length} episodes with #catlist-listview a selector`);
    }
    
    if (episodeElements.length === 0) {
      episodeElements = $('.cat-eps a');
      console.log(`[Scraper] Found ${episodeElements.length} episodes with .cat-eps a selector`);
    }
    
    if (episodeElements.length === 0) {
      // Try a more generic approach - match all wcofun links with episode in the URL or text
      episodeElements = $('a').filter((i, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim().toLowerCase();
        
        // Look for typical episode indicators
        return (
          (href.includes('wcofun.net') || href.startsWith('/')) && 
          (href.includes('episode') || 
           href.includes('-episode-') || 
           text.includes('episode') || 
           (href.includes('dubbed') || href.includes('subbed')))
        );
      });
      console.log(`[Scraper] Found ${episodeElements.length} episodes with generic episode pattern`);
    }
    
    if (episodeElements.length === 0) {
      // As a last resort, try to find all links that might be episodes
      // by looking at link patterns common on the site
      episodeElements = $('a').filter((i, el) => {
        const href = $(el).attr('href') || '';
        // For wcofun, most episode links have these patterns:
        return (
          href.includes('wcofun.net') ||
          (href.startsWith('/') && 
            (href.includes('-episode-') || 
             href.includes('-english-') || 
             href.includes('dubbed') || 
             href.includes('subbed')))
        );
      });
      console.log(`[Scraper] Last resort found ${episodeElements.length} possible episode links`);
    }
    
    // Log all links for debugging
    console.log('[Scraper] All links on page:');
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      if (href && text) {
        console.log(`  ${i}: ${text} - ${href}`);
      }
    });
    
    // Process all found episode links
    episodeElements.each((index, element) => {
      const $element = $(element);
      const title = $element.text().trim();
      let sourceUrl = $element.attr('href') || '';
      
      if (!sourceUrl) return;
      
      // Construct the full URL if it's a relative path
      const fullUrl = sourceUrl.startsWith('http') 
        ? sourceUrl 
        : `https://www.wcofun.net${sourceUrl.startsWith('/') ? '' : '/'}${sourceUrl}`;
      
      // Try to extract episode number and season from title
      const episodeMatch = title.match(/episode\s*(\d+)/i) || 
                          sourceUrl.match(/episode[^0-9]*(\d+)/i) ||
                          sourceUrl.match(/-(\d+)-english/i);
                          
      const seasonMatch = title.match(/season\s*(\d+)/i) || 
                         sourceUrl.match(/season[^0-9]*(\d+)/i);
      
      const episodeNumber = episodeMatch ? parseInt(episodeMatch[1]) : index + 1;
      const season = seasonMatch ? parseInt(seasonMatch[1]) : 1;
      
      // Don't add duplicates
      if (!episodes.some(e => e.sourceUrl === fullUrl)) {
        episodes.push({
          seriesId,
          title: title || `Episode ${episodeNumber}`,
          episodeNumber,
          season,
          duration: '', // This will be determined when downloading
          sourceUrl: fullUrl,
          downloadUrl: '',
        });
      }
    });
    
    console.log(`[Scraper] Created ${episodes.length} episode objects for series ID ${seriesId}`);
    return episodes;
  }

  /**
   * Parse a single episode page to get the download URL
   */
  async parseEpisodePage(html: string): Promise<string> {
    const $ = cheerio.load(html);
    console.log(`[Scraper] Parsing episode page to find video URL`);
    
    // First try to find direct download link
    let downloadUrl = '';
    
    // Get all iframes, not just the first one
    const iframes = $('iframe').toArray();
    console.log(`[Scraper] Found ${iframes.length} iframes on the page`);
    
    // Try to get video from each iframe
    for (const iframe of iframes) {
      const iframeSrc = $(iframe).attr('src');
      if (!iframeSrc) continue;
      
      console.log(`[Scraper] Processing iframe with src: ${iframeSrc}`);
      
      try {
        // Need to get the content from the iframe to find the actual video source
        const iframeHtml = await this.getSourceHtml(iframeSrc);
        const $iframe = cheerio.load(iframeHtml);
        
        // Look for video sources in the iframe
        const videoSources = $iframe('video source').toArray();
        for (const source of videoSources) {
          const src = $iframe(source).attr('src');
          if (src && this.isValidVideoUrl(src)) {
            downloadUrl = src;
            console.log(`[Scraper] Found valid video source in iframe: ${downloadUrl}`);
            break;
          }
        }
        
        if (!downloadUrl) {
          // If no direct video source, check for video element with src
          const videoSrc = $iframe('video').attr('src');
          if (videoSrc && this.isValidVideoUrl(videoSrc)) {
            downloadUrl = videoSrc;
            console.log(`[Scraper] Found valid video element with src: ${downloadUrl}`);
          }
        }
        
        if (!downloadUrl) {
          // Try to find from script tags
          const scripts = $iframe('script').toArray();
          console.log(`[Scraper] Checking ${scripts.length} script tags in iframe`);
          
          for (const script of scripts) {
            const scriptContent = $iframe(script).html() || '';
            
            // Check for different video URL patterns
            let match = scriptContent.match(/['"]([^'"]*\.mp4)['"]/);
            if (!match) match = scriptContent.match(/['"]([^'"]*\.m3u8)['"]/);
            if (!match) match = scriptContent.match(/file:\s*['"]([^'"]+)['"]/);
            if (!match) match = scriptContent.match(/source:\s*['"]([^'"]+)['"]/);
            
            if (match && match[1]) {
              const url = match[1];
              // Validate URL is a valid video file URL
              if (this.isValidVideoUrl(url)) {
                downloadUrl = url;
                console.log(`[Scraper] Found valid video URL in script: ${downloadUrl}`);
                break;
              } else {
                console.log(`[Scraper] Found invalid video URL in script: ${url}, skipping`);
              }
            }
          }
        }
        
        // If we found a URL, break the loop
        if (downloadUrl) break;
        
      } catch (error) {
        console.error(`[Scraper] Error parsing iframe ${iframeSrc}:`, error);
      }
    }
    
    // Check main page if no URL found in iframes
    if (!downloadUrl) {
      console.log(`[Scraper] Checking main page for video URL`);
      
      // Check for video elements in the main page
      const videoSrc = $('video').attr('src');
      if (videoSrc && this.isValidVideoUrl(videoSrc)) {
        downloadUrl = videoSrc;
        console.log(`[Scraper] Found valid video source in main page: ${downloadUrl}`);
      }
      
      if (!downloadUrl) {
        // Try to find in the main page scripts
        const scripts = $('script').toArray();
        console.log(`[Scraper] Checking ${scripts.length} script tags in main page`);
        
        for (const script of scripts) {
          const scriptContent = $(script).html() || '';
          
          // Check for different video URL patterns
          let match = scriptContent.match(/['"]([^'"]*\.mp4)['"]/);
          if (!match) match = scriptContent.match(/['"]([^'"]*\.m3u8)['"]/);
          if (!match) match = scriptContent.match(/file:\s*['"]([^'"]+)['"]/);
          if (!match) match = scriptContent.match(/source:\s*['"]([^'"]+)['"]/);
          
          if (match && match[1]) {
            const url = match[1];
            // Validate URL is a valid video file URL
            if (this.isValidVideoUrl(url)) {
              downloadUrl = url;
              console.log(`[Scraper] Found valid video URL in main page script: ${downloadUrl}`);
              break;
            } else {
              console.log(`[Scraper] Found invalid video URL in main page script: ${url}, skipping`);
            }
          }
        }
      }
    }
    
    if (downloadUrl) {
      console.log(`[Scraper] Successfully found download URL: ${downloadUrl}`);
    } else {
      console.log(`[Scraper] Could not find any video URL in the episode page`);
    }
    
    return downloadUrl;
  }
}

export const scraper = new Scraper();
