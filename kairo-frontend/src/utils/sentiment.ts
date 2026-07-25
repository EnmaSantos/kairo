export function getSentimentEmoji(sentiment: string | null | undefined): string {
  switch (sentiment?.toLowerCase()) {
    case 'joy':
      return '😄';
    case 'sadness':
      return '😢';
    case 'anger':
      return '😠';
    case 'fear':
      return '😨';
    case 'surprise':
      return '😲';
    case 'disgust':
      return '🤢';
    default:
      return '📝';
  }
}
