package external

import (
	"encoding/base64"
	"fmt"
	"github.com/GeneralTask/task-manager/backend/database"
	"github.com/GeneralTask/task-manager/backend/testutils"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"google.golang.org/api/gmail/v1"
	"log"
	"net/http/httptest"
	"testing"
)

func TestGetRecipients(t *testing.T) {
	emptyRecipients := make([]database.Recipient, 0)

	t.Run("NoHeaders", func(t *testing.T) {
		headers := make([]*gmail.MessagePartHeader, 0)
		recipients := *GetRecipients(headers)
		expected := database.Recipients{
			To:  emptyRecipients,
			Cc:  emptyRecipients,
			Bcc: emptyRecipients,
		}
		assert.Equal(t, expected, recipients)
	})

	t.Run("OneToRecipient", func(t *testing.T) {
		headers := []*gmail.MessagePartHeader{
			{
				Name:  "To",
				Value: `"Scott" <scott@generaltask.com>`,
			},
		}
		expected := database.Recipients{
			To: []database.Recipient{{
				Name:  "Scott",
				Email: "scott@generaltask.com",
			}},
			Cc:  emptyRecipients,
			Bcc: emptyRecipients,
		}
		recipients := *GetRecipients(headers)
		assert.Equal(t, expected, recipients)
	})

	t.Run("OneToRecipientNoName", func(t *testing.T) {
		headers := []*gmail.MessagePartHeader{
			{
				Name:  "To",
				Value: `"<scott@generaltask.com>`,
			},
		}
		expected := database.Recipients{
			To: []database.Recipient{{
				Name:  "",
				Email: "scott@generaltask.com",
			}},
			Cc:  emptyRecipients,
			Bcc: emptyRecipients,
		}
		recipients := *GetRecipients(headers)
		assert.Equal(t, expected, recipients)
	})

	t.Run("MultipleToRecipients", func(t *testing.T) {
		headers := []*gmail.MessagePartHeader{
			{
				Name:  "To",
				Value: `"Scott" <scott@generaltask.com>, "Nolan" <nolan@generaltask.com>`,
			},
		}
		expected := database.Recipients{
			To: []database.Recipient{
				{
					Name:  "Scott",
					Email: "scott@generaltask.com",
				},
				{
					Name:  "Nolan",
					Email: "nolan@generaltask.com",
				}},
			Cc:  emptyRecipients,
			Bcc: emptyRecipients,
		}
		recipients := *GetRecipients(headers)
		assert.Equal(t, expected, recipients)
	})

	t.Run("MultipleRecipientsAll", func(t *testing.T) {
		headers := []*gmail.MessagePartHeader{
			{
				Name:  "To",
				Value: `"Scott" <scott@generaltask.com>, "Nolan" <nolan@generaltask.com>`,
			},
			{
				Name:  "Cc",
				Value: `"Duck" <duck@email.com>, Goose <goose@email.com>`,
			},
			{
				Name:  "Bcc",
				Value: `scott@generaltask.com, Nolan <nolan@generaltask.com>`,
			},
		}
		expected := database.Recipients{
			To: []database.Recipient{
				{
					Name:  "Scott",
					Email: "scott@generaltask.com",
				},
				{
					Name:  "Nolan",
					Email: "nolan@generaltask.com",
				}},
			Cc: []database.Recipient{
				{
					Name:  "Duck",
					Email: "duck@email.com",
				},
				{
					Name:  "Goose",
					Email: "goose@email.com",
				}},
			Bcc: []database.Recipient{
				{
					Name:  "",
					Email: "scott@generaltask.com",
				},
				{
					Name:  "Nolan",
					Email: "nolan@generaltask.com",
				}},
		}
		recipients := *GetRecipients(headers)
		assert.Equal(t, expected, recipients)
	})
}

func TestGetEmails(t *testing.T) {
	t.Run("Success", func(t *testing.T) {
		userID := primitive.NewObjectID()

		// (1) Arrange: setup testing objects and mock data
		threadsMap := map[string]*gmail.Thread{
			"gmail_thread_1": {
				Id: "gmail_thread_1",
				Messages: []*gmail.Message{
					{
						Id:           "gmail_thread_1_email_1",
						InternalDate: testutils.CreateTimestamp("2001-04-20").Unix(),
						LabelIds:     []string{"UNREAD"},
						Payload: &gmail.MessagePart{
							Body: &gmail.MessagePartBody{
								Data: base64.URLEncoding.EncodeToString([]byte("test message body gmail_thread_1_email_1")),
							},
							Headers: []*gmail.MessagePartHeader{
								{Name: "From", Value: "from@generaltask.com"},
								{Name: "Reply-To", Value: "reply-to@generaltask.com"},
								{Name: "Subject", Value: "test subject"},
								{Name: "Message-ID", Value: "smtp_gmail_thread_1_email_1"},
							},
							MimeType: "text/plain",
							// todo - not sure about using `Parts`
							//Parts:    []*gmail.MessagePart{}
						},
					},
					{
						Id:           "gmail_thread_1_email_2",
						InternalDate: testutils.CreateTimestamp("2020-04-20").Unix(),
						LabelIds:     []string{"UNREAD"},
						Payload: &gmail.MessagePart{
							Body: &gmail.MessagePartBody{
								Data: base64.URLEncoding.EncodeToString([]byte("test message body gmail_thread_1_email_2")),
							},
							Headers: []*gmail.MessagePartHeader{
								{Name: "From", Value: "from@generaltask.com"},
								{Name: "Reply-To", Value: "reply-to@generaltask.com"},
								{Name: "Subject", Value: "test subject"},
								{Name: "Message-ID", Value: "smtp_gmail_thread_1_email_1"},
							},
							MimeType: "text/plain",
							// todo - not sure about using `Parts`
							//Parts:    []*gmail.MessagePart{}
						},
					},
				},
			},
			"gmail_thread_2": {
				Id: "gmail_thread_2",
				Messages: []*gmail.Message{
					{
						Id:           "gmail_thread_2_email_1",
						InternalDate: testutils.CreateTimestamp("2019-04-20").Unix(),
						LabelIds:     []string{},
						Payload: &gmail.MessagePart{
							Body: &gmail.MessagePartBody{
								Data: base64.URLEncoding.EncodeToString([]byte("test message body gmail_thread_2_email_1")),
							},
							Headers: []*gmail.MessagePartHeader{
								{Name: "From", Value: "from@generaltask.com"},
								{Name: "Reply-To", Value: "reply-to@generaltask.com"},
								{Name: "Subject", Value: "test subject"},
								{Name: "Message-ID", Value: "smtp_gmail_thread_1_email_1"},
							},
							MimeType: "text/plain",
						},
					},
				},
			},
		}

		server := getGinGmailFetchServer(t, threadsMap)
		defer server.Close()
		mockGmailSource := GmailSource{
			Google: GoogleService{
				OverrideURLs: GoogleURLOverrides{GmailFetchURL: &server.URL},
			},
		}

		// (2) Act: call the API / perform the work
		var emailResult = make(chan EmailResult)
		go mockGmailSource.GetEmails(userID, "me", emailResult)
		result := <-emailResult

		// (3) Assert: verify results as expected
		assert.NoError(t, result.Error)
		assert.Equal(t, 3, len(result.Emails))

		expectedThreadsInDB := []*database.Item{
			{
				TaskBase: database.TaskBase{},
				TaskType: database.TaskType{IsThread: true},
				EmailThread: database.EmailThread{
					ThreadID:      "gmail_thread_1",
					LastUpdatedAt: *testutils.CreateDateTime("2020-04-20"),
					Emails: []database.Email{
						{
							SMTPID:       "",
							ThreadID:     "",
							EmailID:      "",
							Subject:      "",
							Body:         "",
							SenderDomain: "",
							SenderEmail:  "",
							SenderName:   "",
							ReplyTo:      "",
							IsUnread:     false,
							Recipients:   database.Recipients{},
							SentAt:       0,
						},
					},
				},
			},
		}

		db, dbCleanup, _ := database.GetDBConnection()
		defer dbCleanup()
		threadItems, err := database.GetEmailThreads(db, userID, false, database.Pagination{}, nil)
		assert.NoError(t, err)

		for _, thread := range *threadItems {
			//log.Printf("%+v", thread.EmailThread)
			log.Printf("%+v", thread.EmailThread.ThreadID)
		}

		//thread, err := database.GetItem(context.Background(), taskID, userID)
		//log.
		//firstTask := result.CalendarEvents[0]
		//assertCalendarEventsEqual(t, &standardTask, firstTask)
		//assert.NoError(t, err)
	})
}

func assertThreadItemsEqual(t *testing.T, a *database.Item, b *database.Item) {
	assert.Equal(t, a.TaskType, b.TaskType)
	assert.Equal(t, a.IDExternal, b.IDExternal)
	assert.Equal(t, a.Title, b.Title)
	assert.Equal(t, a.SourceID, b.SourceID)
}

func getGinGmailFetchServer(t *testing.T, threadsMap map[string]*gmail.Thread) *httptest.Server {
	return httptest.NewServer(func() *gin.Engine {

		//r := gin.Default()
		//gin.SetMode(gin.ReleaseMode)
		//r := gin.New()
		w := httptest.NewRecorder()
		_, r := gin.CreateTestContext(w)

		assert.Fail(t, "oops")

		v1 := r.Group("/gmail/v1/users/:gmailAccountID")
		{
			v1.GET("/threads", func(c *gin.Context) {
				threads := make([]*gmail.Thread, 0, len(threadsMap))
				for _, value := range threadsMap {
					threads = append(threads, value)
				}
				response := &gmail.ListThreadsResponse{Threads: threads}
				c.JSON(200, response)
			})
			v1.GET("/threads/:threadID", func(c *gin.Context) {
				log.Println(c.Param("threadID"))
				log.Println(threadsMap[c.Param("threadID")])

				response := threadsMap[c.Param("threadID")]

				c.JSON(200, response)
			})
		}
		return r
	}())
}

func createTestGmailMessage(
	externalMessageID string,
	isUnread bool,
	subject string,
	dt string,
) *gmail.Message {

	res := gmail.Message{
		Id:           externalMessageID,
		InternalDate: testutils.CreateTimestamp(dt).Unix(),
		Payload: &gmail.MessagePart{
			Body: &gmail.MessagePartBody{
				Data: base64.URLEncoding.EncodeToString([]byte(fmt.Sprintf("test message body %s", externalMessageID))),
			},
			Headers: []*gmail.MessagePartHeader{
				{Name: "From", Value: "from@generaltask.com"},
				{Name: "Reply-To", Value: "reply-to@generaltask.com"},
				{Name: "Subject", Value: subject},
				{Name: "Message-ID", Value: fmt.Sprintf("smtp_%s", externalMessageID)},
			},
			MimeType: "text/plain",
			// todo - not sure about using `Parts`
			//Parts:    []*gmail.MessagePart{}
		},
	}
	if isUnread {
		res.LabelIds = append(res.LabelIds, "UNREAD")
	}
	return res
}