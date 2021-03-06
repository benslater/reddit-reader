/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Image,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import base64 from 'base-64';
import queryStringify from 'qs-stringify';

import Text from 'components/Text';
import FloatingView from 'components/FloatingView';
import SubredditSelector from 'components/SubredditSelector';
import CommentDrawer from 'components/CommentDrawer';

import { AppState } from './reducers';
import { password, username, basicAuthPair } from './credentials';

import userIcon from 'assets/icons/png/24/basic/user.png';
import commentTextIcon from 'assets/icons/png/24/chatting/comment-text.png';

import { setAccessTokenActionCreator } from 'actions/global';
import { useFetchListing } from 'hooks/useFetchListing';

import { RedditListingResponse, RedditPost, RedditSubreddit } from 'types';

import styles from './styles';

declare const global: { HermesInternal: null | {} };

interface RedditResponseDataState<T extends RedditPost | RedditSubreddit> {
  listing: RedditListingResponse<T>;
  count: number;
}

const initialPostDataState: RedditResponseDataState<RedditPost> = {
  listing: {
    kind: null,
    data: null,
  },
  count: 0,
};

const fetchSubredditContent = async (
  accessToken: string,
  subredditUrl: string,
  params: Record<string, any> = {},
): Promise<RedditListingResponse<RedditPost>> => {
  const res = await fetch(
    `https://oauth.reddit.com${subredditUrl}hot?g=gb&raw_json=1&limit=2&${queryStringify(
      params,
    )}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  // TODO: These responses aren't super pleasant to work with. Make adapter.
  return await res.json();
};

type AppProps = ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>;
const App = ({ accessToken, setAccessToken }: AppProps) => {
  // TODO: Getting unweildy, use redux.
  const [postData, setPostData] = useState<typeof initialPostDataState>(
    initialPostDataState,
  );
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isCommentDrawerVisible, setIsCommentDrawerVisible] = useState(false);
  const [visiblePost, setVisiblePost] = useState<RedditPost | null>(null);
  const [currentSubredditUrl, setCurrentSubredditUrl] = useState<string>('/');

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 100,
  });
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: any }) => {
      setVisiblePost(viewableItems[0]?.item ?? null);
      setIsDropdownVisible(false);
    },
  );

  useEffect(() => {
    if (!accessToken) {
      const getAccessToken = async () => {
        const url = `https://www.reddit.com/api/v1/access_token?grant_type=password&username=${username}&password=${password}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${base64.encode(basicAuthPair)}`,
          },
        });
        const { access_token: token } = await res.json();
        setAccessToken(token);
      };

      getAccessToken();
    }
  }, [accessToken, setAccessToken]);

  useEffect(() => {
    const getSubredditContent = async () => {
      if (!currentSubredditUrl || !accessToken) {
        return;
      }

      const listing = await fetchSubredditContent(
        accessToken,
        currentSubredditUrl,
      );

      setPostData((currentPostData) => ({
        listing,
        count: currentPostData?.count + (listing.data?.children.length ?? 0),
      }));
      // TODO: This solves this issue of title being absent on subreddit change, but feels a bit too imperative.
      // Have another look into the FlatList API.
      setVisiblePost(listing.data?.children[0] ?? null);
    };

    getSubredditContent();
  }, [currentSubredditUrl, accessToken]);

  const { listingState: subredditData } = useFetchListing<RedditSubreddit>(
    accessToken,
    'https://oauth.reddit.com/subreddits/mine/subscriber?raw_json=1',
  );

  const getNextItems = async () => {
    // TODO: Deal with no access token more appropriately.
    if (!accessToken) {
      return;
    }

    const listing = await fetchSubredditContent(
      accessToken,
      currentSubredditUrl,
      {
        after: postData.listing.data?.after,
      },
    );

    if (!postData.listing.data) {
      // Should never happen...
      throw new Error('No existing post data');
    }
    if (!listing.data) {
      throw new Error('Could not fetch subreddit content');
    }

    setPostData({
      listing: {
        ...listing,
        data: {
          ...listing.data,
          children: [
            ...postData.listing.data.children,
            ...listing.data.children,
          ],
        },
      },
      count: 0,
    });
  };

  // TODO: Network requests fail until debugger is connected = infinite spinner
  if (!accessToken) {
    // TODO: Simple solution, replace with something Lottie-based
    return <ActivityIndicator style={styles.fullscreen} />;
  }

  return (
    <SafeAreaView style={styles.fullscreen}>
      <View style={[styles.fullscreen, styles.purpleBackground]}>
        <View style={styles.fullscreen}>
          {/* TODO: Break these out - this isn't actually a header.
           *  Have all the floating buttons in an ActionsOverlay component?
           */}
          <View style={styles.headerContainer}>
            <TouchableOpacity>
              <FloatingView>
                <Image style={styles.icon} source={userIcon} />
              </FloatingView>
            </TouchableOpacity>
            {/* TODO: This fundamentally doesn't look good. Redesign. Maybe allow tap to expand? */}
            {visiblePost && (
              <FloatingView style={styles.titleContainer}>
                <Text>{visiblePost.data.title}</Text>
              </FloatingView>
            )}

            <SubredditSelector
              open={isDropdownVisible}
              toggleOpen={() => setIsDropdownVisible(!isDropdownVisible)}
              subreddits={subredditData?.listing.data?.children}
              selectedSubreddit={currentSubredditUrl}
              onSelect={(subreddit) => {
                setVisiblePost(null);
                setPostData(initialPostDataState);
                setCurrentSubredditUrl(subreddit.data.url);
                setIsDropdownVisible(false);
              }}
            />
          </View>
          <FlatList
            horizontal
            pagingEnabled
            data={postData?.listing.data?.children}
            renderItem={({
              item: {
                data: { url },
              },
            }) => {
              if (
                url &&
                ['.jpg', '.gif', '.png', '.jpeg'].some((ext) =>
                  url.includes(ext),
                )
              ) {
                return (
                  <>
                    <View style={styles.contentContainer}>
                      <Image
                        style={styles.mainImage}
                        source={{ uri: url }}
                        resizeMode="contain"
                      />
                    </View>
                  </>
                );
              } else {
                return (
                  <View style={styles.contentContainer}>
                    <Text>Not implemented</Text>
                  </View>
                );
              }
            }}
            onEndReached={() => getNextItems()}
            onEndReachedThreshold={0.5}
            keyExtractor={(_, index) => `${index}`}
            onViewableItemsChanged={onViewableItemsChanged.current}
            viewabilityConfig={viewabilityConfig.current}
          />
          <View style={styles.footerContainer}>
            <TouchableOpacity onPress={() => setIsCommentDrawerVisible(true)}>
              <FloatingView>
                <Image style={styles.icon} source={commentTextIcon} />
              </FloatingView>
            </TouchableOpacity>
          </View>
          <CommentDrawer
            visible={isCommentDrawerVisible}
            postId={visiblePost?.data.id}
            // These 2 are ridiculous. Add redux asap.
            accessToken={accessToken}
            subredditUrl={currentSubredditUrl}
            onClose={() => setIsCommentDrawerVisible(false)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const mapStateToProps = ({ global: { accessToken } }: AppState) => ({
  accessToken,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  setAccessToken: (accessToken: string) =>
    dispatch(setAccessTokenActionCreator(accessToken)),
});

const ConnectedApp = connect(mapStateToProps, mapDispatchToProps)(App);

export default ConnectedApp;
